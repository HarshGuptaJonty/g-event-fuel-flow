import os
import traceback
import datetime
import uuid
import time
import firebase_admin
from firebase_admin import credentials, db
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import vertexai
from vertexai.generative_models import GenerativeModel, Tool, Part, FunctionDeclaration

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. INITIALIZE FIREBASE (Cloud Native Auth)
try:
    # Use the automatic credentials
    firebase_admin.initialize_app(options={
        'databaseURL': 'https://fuel-flow-india-default-rtdb.asia-southeast1.firebasedatabase.app'
    })
    print("Firebase Initialized")
except Exception as e:
    print(f"Firebase Init Error (might be already init): {e}")

# 2. INITIALIZE VERTEX AI
vertexai.init(project="ethereal-yen-478212-v9", location="europe-west1")

# 3. DEFINE THE TOOL (AI extracts Names, not IDs)
complex_transaction_func = FunctionDeclaration(
    name="process_transaction",
    description="Process a delivery or return. Extracts names which backend will look up.",
    parameters={
        "type": "object",
        "properties": {
            "customer_name": {"type": "string", "description": "Name of the customer"},
            "delivery_boy_name": {"type": "string", "description": "Name of the delivery person"},
            "product_name": {"type": "string", "description": "Name of product (e.g. 15KG LPG)"},
            "sent_units": {"type": "integer", "description": "Units given to customer (Delivery)"},
            "received_units": {"type": "integer", "description": "Units taken back (Return)"},
            "payment_amount": {"type": "integer", "description": "Payment collected if any"}
        },
        "required": ["customer_name", "product_name"]
    }
)

inventory_tool = Tool(
    function_declarations=[complex_transaction_func]
)

# Use Gemini 2.5 Flash for speed
model = GenerativeModel("gemini-2.5-flash", tools=[inventory_tool])

# --- HELPER FUNCTIONS TO SEARCH DB ---

def find_entity(node_name, search_name):
    """Searches a node (e.g., 'customers') for a record matching the name."""
    try:
        ref = db.reference(node_name)
        # Get all data (In production, use query_by_child for scale)
        snapshot = ref.get() 
        
        if not snapshot:
            return None

        # Simple fuzzy search
        search_lower = search_name.lower()
        for key, val in snapshot.items():
            if 'fullName' in val and search_lower in val['fullName'].lower():
                val['userId'] = key # Ensure ID is part of the object
                return val
            if 'name' in val and search_lower in val['name'].lower(): # For products
                val['productId'] = key
                return val
                
        return None
    except Exception as e:
        print(f"Search Error: {e}")
        return None

# --- THE CORE LOGIC ---

def execute_complex_write(cust_name, boy_name, prod_name, sent, received, payment):
    try:
        # 1. LOOKUP DATA
        customer = find_entity('customers', cust_name)
        delivery_boy = find_entity('delivery_boys', boy_name) if boy_name else None
        product = find_entity('products', prod_name)

        # Fallbacks if data not found (Prevents Crash)
        if not customer:
            customer = {"fullName": cust_name, "phoneNumber": "", "userId": f"UNKNOWN_{uuid.uuid4().hex[:6]}"}
        if not delivery_boy:
            delivery_boy = {"fullName": boy_name or "Unknown", "phoneNumber": "", "userId": "UNKNOWN"}
        if not product:
            product = {"name": prod_name, "productId": f"UNKNOWN_{uuid.uuid4().hex[:6]}", "rate": 0}

        # 2. CALCULATE VALUES
        rate = product.get('rate', 0)
        total_amt = (sent * rate) 
        # If payment not specified by AI, assume full payment if delivery
        if payment is None:
            payment = total_amt

        # 3. CONSTRUCT THE COMPLEX JSON
        tx_id = datetime.datetime.now().strftime("%Y%m%d_%H%M%S") + "_" + uuid.uuid4().hex[:4]
        current_time_ms = int(time.time() * 1000)
        
        transaction_data = {
            "data": {
                "customer": {
                    "fullName": customer.get('fullName'),
                    "phoneNumber": customer.get('phoneNumber', ""),
                    "userId": customer.get('userId')
                },
                "date": datetime.datetime.now().strftime("%d/%m/%Y"),
                "transactionId": tx_id,
                "deliveryBoyList": [
                    {
                        "fullName": delivery_boy.get('fullName'),
                        "phoneNumber": delivery_boy.get('phoneNumber', ""),
                        "userId": delivery_boy.get('userId'),
                        "deliveryDone": [
                            {
                                "productId": product.get('productId'),
                                "sentUnits": sent or 0,
                                "recievedUnits": received or 0
                            }
                        ]
                    }
                ],
                "selectedProducts": [
                    {
                        "productData": product, # Embed full product details
                        "sentUnits": sent or 0,
                        "recievedUnits": received or 0,
                        "paymentAmt": 0 # Example logic
                    }
                ],
                "payment": payment,
                "total": total_amt,
                "status": "Paid" if payment >= total_amt else "Pending",
                "importIndex": 0
            },
            "others": {
                "createdBy": "AI_AGENT",
                "createdTime": current_time_ms,
                "editedBy": "AI_AGENT",
                "editedTime": current_time_ms
            }
        }

        # 4. WRITE TO DB
        ref = db.reference('transactions')
        # Use the transactionId as the key
        ref.child(tx_id).set(transaction_data)

        return f"SUCCESS: Logged Transaction {tx_id}. {sent} units sent to {customer['fullName']}."

    except Exception as e:
        print(traceback.format_exc())
        return f"DB ERROR: {str(e)}"

@app.post("/chat")
async def chat_endpoint(request: Request):
    try:
        data = await request.json()
        user_message = data.get("message")
        print(f"Received: {user_message}")

        chat = model.start_chat()
        response = chat.send_message(user_message)
        
        if not response.candidates:
            return {"reply": "No response from AI."}
            
        part = response.candidates[0].content.parts[0]
        
        if part.function_call:
            fc = part.function_call
            args = dict(fc.args)
            
            print(f"Calling Logic with: {args}")
            
            result_msg = execute_complex_write(
                cust_name=args.get("customer_name"),
                boy_name=args.get("delivery_boy_name"),
                prod_name=args.get("product_name"),
                sent=int(args.get("sent_units", 0)),
                received=int(args.get("received_units", 0)),
                payment=args.get("payment_amount") # Can be None
            )
            return {"reply": result_msg}
            
        return {"reply": response.text}

    except Exception as e:
        return {"reply": f"SYSTEM ERROR: {str(e)}"}