import os
import traceback
import firebase_admin
from firebase_admin import credentials, db
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import vertexai
from vertexai.generative_models import GenerativeModel, Tool, Part, FunctionDeclaration
import datetime
import random
import string

# Initialize FastAPI
app = FastAPI()

# Handle CORS (This allows your Angular app to talk to this server)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. INITIALIZE FIREBASE
# Use the automatic credentials (no file needed)
try:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred, {
        'databaseURL': 'https://g-event-fuel-flow-default-rtdb.europe-west1.firebasedatabase.app'
    }) #fuel-flow-india-default-rtdb.asia-southeast1.firebasedatabase.app
except Exception as e:
    print(f"Firebase Init Error: {e}")

# 2. INITIALIZE VERTEX AI
# We wrap this to catch errors early
try:
    vertexai.init(project="ethereal-yen-478212-v9", location="europe-west1")
    print("Vertex AI Initialized")
except Exception as e:
    print(f"Vertex Init Error: {e}")

# 3. DEFINE TOOLS
log_transaction_func = FunctionDeclaration(
    name="log_transaction",
    description="Log a delivery (OUT) or return (IN) of cylinders.",
    parameters={
        "type": "object",
        "properties": {
            "customer": {"type": "string", "description": "Name of the customer"},
            "product": {"type": "string", "description": "Type of product (LPG or Oxygen)"},
            "qty": {"type": "integer", "description": "Quantity of cylinders"},
            "action": {"type": "string", "description": "Action type: IN or OUT"}
        },
        "required": ["customer", "product", "qty", "action"]
    }
)

cylinder_tool = Tool(
    function_declarations=[log_transaction_func]
)

# The latest stable 2.5 Flash model
model = GenerativeModel("gemini-2.5-flash", tools=[cylinder_tool])

# 4. DB LOGIC
def execute_db_write(customer, product, qty, action):
    # Generate transaction ID in the format YYYYMMDD_HHmmSS_Random5char
    now = datetime.datetime.now()
    timestamp_part = now.strftime("%Y%m%d_%H%M%S")
    random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
    transactionId = f"{timestamp_part}_{random_part}"

    try:
        ref = db.reference('transactions/'+transactionId)
        ref.set({
            'customer': customer,
            'product': product,
            'qty': qty,
            'action': action,
            'timestamp': {".sv": "timestamp"}
        })
        return f"Logged {action} {qty} {product} for {customer}."
    except Exception as e:
        return f"DB WRITE ERROR: {str(e)}"

@app.post("/chat")
async def chat_endpoint(request: Request):
    # THE SAFETY NET: Catch any crash and report it
    try:
        data = await request.json()
        user_message = data.get("message")
        print(f"Received: {user_message}")

        chat = model.start_chat()
        response = chat.send_message(user_message)
        
        if not response.candidates:
            return {"reply": "AI returned no candidates."}
            
        part = response.candidates[0].content.parts[0]
        
        if part.function_call:
            fc = part.function_call
            args = dict(fc.args)
            result_msg = execute_db_write(
                customer=args.get("customer"),
                product=args.get("product"),
                qty=int(args.get("qty", 0)),
                action=args.get("action")
            )
            return {"reply": result_msg}
            
        return {"reply": response.text}

    except Exception as e:
        # HERE IS THE FIX: Return the error instead of crashing 500
        error_msg = traceback.format_exc()
        print(f"CRITICAL ERROR: {error_msg}")
        return {"reply": f"SYSTEM ERROR: {str(e)}"}