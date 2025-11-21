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
import time

# imporing helper functions
import customer
import admin
import delivery
import product

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

# 3. Load Objects first
def refresh_memory():
    # Fetch data on startup
    customer.refresh_customer_cache()
    admin.refresh_admin_cache()
    delivery.refresh_delivery_boy_cache()
    product.refresh_product_cache()

refresh_memory()

@app.get("/health")
async def health_endpoint():
    return {
            "status": "OK",
            "CUSTOMER": len(customer.CUSTOMER_CACHE),
            "ADMIN": len(admin.ADMIN_CACHE),
            "DELIVERY_BOY": len(delivery.DELIVERY_BOY_CACHE),
            "PRODUCT": len(product.PRODUCT_CACHE)
        }

# 3. DEFINE TOOLS
# Tool 1: Process Transactions
# log_transaction_func = FunctionDeclaration(
#     name="log_transaction",
#     description="Log a delivery (OUT) or return (IN) of specific product.",
#     parameters={
#         "type": "object",
#         "properties": {
#             "customer": {"type": "string", "description": "Name of the customer"},
#             "product": {"type": "string", "description": "Type of product (LPG or Oxygen)"},
#             "qty": {"type": "integer", "description": "Quantity of cylinders"},
#             "action": {"type": "string", "description": "Action type: IN or OUT"}
#         },
#         "required": ["customer", "product", "qty", "action"]
#     }
# )

complex_transaction_func = FunctionDeclaration(
    name="process_transaction",
    description="Log a business transaction where goods are delivered to a customer or returned by them.",
    parameters={
        "type": "object",
        "properties": {
            "customer_name": {
                "type": "string", 
                "description": "The end client/customer who bought or returned the item. E.g. In 'Sweta delivered to Rakesh', this is Rakesh."
            },
            "delivery_boy_name": {
                "type": "string", 
                "description": "The staff member or delivery person who performed the task. E.g. In 'Sweta delivered to Rakesh', this is Sweta."
            },
            "product_name": {"type": "string", "description": "Name of product (e.g. LPG 14KG, Oxygen)"},
            "sent_units": {
                "type": "integer", 
                "description": "Quantity SOLD/DELIVERED to customer (OUT). Use this if text says 'delivered', 'gave', 'sold'."
            },
            "received_units": {
                "type": "integer", 
                "description": "Quantity RETURNED by customer (IN). Use this if text says 'returned', 'got back', 'received from'."
            },
            "payment_amount": {"type": "integer", "description": "Payment collected if any"}
        },
        "required": ["customer_name", "product_name", "delivery_boy_name"]
    }
)

# Tool 2: Get Customer Profile (NEW)
get_customer_details_func = FunctionDeclaration(
    name="get_customer_details",
    description="Retrieve full profile details for a specific customer by name.",
    parameters={
        "type": "object",
        "properties": {
            "customer_name": {"type": "string", "description": "Name of the customer to search for"}
        },
        "required": ["customer_name"]
    }
)

# Tool 2: Get admin Profile (NEW)
get_admin_details_func = FunctionDeclaration(
    name="get_admin_details",
    description="Retrieve full profile details for a specific admin by name.",
    parameters={
        "type": "object",
        "properties": {
            "admin_name": {"type": "string", "description": "Name of the admin to search for"}
        },
        "required": ["admin_name"]
    }
)

# Tool 2: Get delivery Profile (NEW)
get_delivery_person_details_func = FunctionDeclaration(
    name="get_delivery_person_details",
    description="Retrieve full profile details for a specific delivery person by name.",
    parameters={
        "type": "object",
        "properties": {
            "delivery_boy_name": {"type": "string", "description": "Name of the delivery person to search for"}
        },
        "required": ["delivery_boy_name"]
    }
)

# Tool 2: Get delivery Profile (NEW)
get_product_details_func = FunctionDeclaration(
    name="get_product_details",
    description="Retrieve full details for a specific product by name.",
    parameters={
        "type": "object",
        "properties": {
            "product_name": {"type": "string", "description": "Name of the product to search for"}
        },
        "required": ["product_name"]
    }
)

# Tool 2: Refresh Memory
refresh_memory_func = FunctionDeclaration(
    name="refresh_memory",
    description="Reloads the database from the server. Use this when data seems outdated.",
    parameters={
        "type": "object",
        "properties": {}, # No parameters required
    }
)

cylinder_tool = Tool(
    function_declarations=[
        complex_transaction_func, 
        get_admin_details_func, get_customer_details_func, get_delivery_person_details_func, get_product_details_func, 
        refresh_memory_func
    ]
)

# The latest stable 2.5 Flash model
model = GenerativeModel("gemini-2.5-flash", tools=[cylinder_tool])

# 4. DB LOGIC
# def execute_db_write(customer, product, qty, action):
    # Generate transaction ID in the format YYYYMMDD_HHmmSS_Random5char
    # now = datetime.datetime.now()
    # timestamp_part = now.strftime("%Y%m%d_%H%M%S")
    # random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
    # transactionId = f"{timestamp_part}_{random_part}"

#     try:
#         ref = db.reference('transactions/'+transactionId)
#         ref.set({
#             'customer': customer,
#             'product': product,
#             'qty': qty,
#             'action': action,
#             'timestamp': {".sv": "timestamp"}
#         })
#         return {'response': f"Logged {action} {qty} {product} for {customer}."}
#     except Exception as e:
#         return {
#                 'warning': {
#                     'text':f"DB WRITE ERROR: {str(e)}",
#                     'action':'call_admin'
#                 }
#             }

def execute_complex_write(cust_name, boy_name, prod_name, sent, received, payment):
    try:
        # customer_data = find_customer_by_name(cust_name)
        customer_data = customer.execute_get_customer_details(cust_name)
        if 'objectArray' in customer_data:
            if len(customer_data['objectArray']) > 1:
                return {
                    "response": f"{len(customer_data['objectArray'])} Customers found. Please provide full name to be specific!",
                    "objectArray": customer_data['objectArray'],
                    'action': 'click_to_redirect'
                }
            else:
                customer_data = customer_data['objectArray'][0]
        else:
            customer.refresh_customer_cache()
            customer_data = customer.execute_get_customer_details(cust_name)
            if 'objectArray' in customer_data:
                if len(customer_data['objectArray']) > 1:
                    return {
                        "response": f"{len(customer_data['objectArray'])} Customers found. Please provide full name to be specific!",
                        "objectArray": customer_data['objectArray'],
                        'action': 'click_to_redirect'
                    }
                else:
                    customer_data = customer_data['objectArray'][0]
            else:
                return {
                    'warning': {
                        'text': f"No customer named '{cust_name}' in bucket. Hence cant proceed!"
                    }
                }
        
        delivery_data = delivery.execute_get_delivery_boy_details(boy_name)
        if 'objectArray' in delivery_data:
            if len(delivery_data['objectArray']) > 1:
                return {
                    "response": f"{len(delivery_data['objectArray'])} Delivery Person found. Please provide full name to be specific!",
                    "objectArray": delivery_data['objectArray'],
                    'action': 'click_to_redirect'
                }
            else:
                delivery_data = delivery_data['objectArray'][0]
        else:
            delivery.refresh_delivery_boy_cache()
            delivery_data = delivery.execute_get_delivery_boy_details(boy_name)
            if 'objectArray' in delivery_data:
                if len(delivery_data['objectArray']) > 1:
                    return {
                        "response": f"{len(delivery_data['objectArray'])} Delivery Person found. Please provide full name to be specific!",
                        "objectArray": delivery_data['objectArray'],
                        'action': 'click_to_redirect'
                    }
                else:
                    delivery_data = delivery_data['objectArray'][0]
            else:
                return {
                    'warning': {
                        'text': f"No delivery person named '{boy_name}' in bucket. Hence cant proceed!"
                    }
                }

        product_data = product.execute_get_product_details(prod_name)
        if 'objectArray' in product_data:
            if len(product_data['objectArray']) > 1:
                return {
                    "response": f"{len(product_data['objectArray'])} Products. Please provide full name to be specific!",
                    "objectArray": product_data['objectArray'],
                    'action': 'click_to_redirect'
                }
            else:
                product_data = product_data['objectArray'][0]
        else:
            product.refresh_product_cache()
            product_data = product.execute_get_product_details(prod_name)
            if 'objectArray' in product_data:
                if len(product_data['objectArray']) > 1:
                    return {
                        "response": f"{len(product_data['objectArray'])} Products. Please provide full name to be specific!",
                        "objectArray": product_data['objectArray'],
                        'action': 'click_to_redirect'
                    }
                else:
                    product_data = product_data['objectArray'][0]
            else:
                return {
                    'warning': {
                        'text': f"No product named '{boy_name}' in bucket. Hence cant proceed!"
                    }
                }


        now = datetime.datetime.now()
        timestamp_part = now.strftime("%Y%m%d_%H%M%S")
        random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
        transactionId = f"{timestamp_part}_{random_part}"
        
        rate = int(product_data.get('rate', 0))
        total_amt = (sent * rate)
        if payment is None: payment = total_amt

        transaction_data = {
            "data": {
                "customer": {
                    "fullName": customer_data.get('fullName'),
                    "phoneNumber": customer_data.get('phoneNumber', ""),
                    "userId": customer_data.get('userId'),
                    "address": customer_data.get('shippingAddress', [customer_data.get('address')])[0]
                },
                "date": datetime.datetime.now().strftime("%d/%m/%Y"),
                "transactionId": transactionId,
                "deliveryBoyList": [
                    {
                        "fullName": delivery_data.get('fullName'),
                        "userId": delivery_data.get('userId'),
                        "deliveryDone": [
                            {
                                "productId": product_data.get('productId'),
                                "sentUnits": sent,
                                "recievedUnits": received
                            }
                        ]
                    }
                ],
                "selectedProducts": [
                    {
                        "productData": product_data,
                        "sentUnits": sent,
                        "recievedUnits": received,
                        "paymentAmt": 0
                    }
                ],
                "payment": payment,
                "total": total_amt,
                "status": "Paid" if payment >= total_amt else "Pending",
                "importIndex": 0,
                "extraDetails": "Logged via AI Agent"
            },
            "others": {
                "createdBy": "AI_AGENT",
                "createdTime": int(time.time() * 1000),
                "editedBy": "AI_AGENT",
                "editedTime": int(time.time() * 1000)
            }
        }

        print(transaction_data)

        ref = db.reference('transactionList')
        ref.child(transactionId).set(transaction_data)

        return {
            "response" : f"SUCCESS: Logged entry for {customer_data['fullName']}.",
            "entry_status": "SUCCESS",
            "context": transaction_data
        }

    except Exception as e:
        print(traceback.format_exc())
        return {
            'warning':{
                "text": f"DB ERROR: {str(e)}",
                "action": "call_admin"
            }
        }

# AI AGENT
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
            return {
                'warning': {
                    'text':"AI returned no candidates.",
                    'action':'call_admin'
                }
            }
            
        part = response.candidates[0].content.parts[0]
        
        if part.function_call:
            fc = part.function_call
            args = dict(fc.args)
            print(f"Function Call Triggered: {fc.name} with {args}")

            if fc.name == "process_transaction":
                result_msg = execute_complex_write(
                    cust_name=args.get("customer_name"),
                    boy_name=args.get("delivery_boy_name"),
                    prod_name=args.get("product_name"),
                    sent=int(args.get("sent_units", 0)),
                    received=int(args.get("received_units", 0)),
                    payment=args.get("payment_amount")
                )
                return result_msg


            elif fc.name == "get_customer_details":
                result_data = customer.execute_get_customer_details(customer_name=args.get("customer_name"))
                if 'objectArray' in result_data:
                    return {
                            "response": f"{len(result_data['objectArray'])} Customers found.",
                            "objectArray": result_data['objectArray'],
                            'action': 'click_to_redirect'
                        }
                else:
                    return result_data


            elif fc.name == "get_admin_details":
                result_data = admin.execute_get_admin_details(admin_name=args.get("admin_name"))
                if 'objectArray' in result_data:
                    return {
                            "response": f"{len(result_data['objectArray'])} Admins found.",
                            "objectArray": result_data['objectArray'],
                            'action': 'click_to_redirect'
                        }
                else:
                    return result_data

            elif fc.name == "get_delivery_person_details":
                result_data = delivery.execute_get_delivery_boy_details(delivery_boy_name=args.get("delivery_boy_name"))
                if 'objectArray' in result_data:
                    return {
                            "response": f"{len(result_data['objectArray'])} Delivery Person(s) found.",
                            "objectArray": result_data['objectArray'],
                            'action': 'click_to_redirect'
                        }
                else:
                    return result_data

            elif fc.name == "get_product_details":
                result_data = product.execute_get_product_details(product_name=args.get("product_name"))
                if 'objectArray' in result_data:
                    return {
                            "response": f"{len(result_data['objectArray'])} Product(s) found.",
                            "objectArray": result_data['objectArray'],
                            'action': 'click_to_redirect'
                        }
                else:
                    return result_data


            elif fc.name == "refresh_memory":
                refresh_memory()
                return {"response": "Memory Refreshed! Please ask me what you need again."}
            
        return {"response": response.text}

    except Exception as e:
        # HERE IS THE FIX: Return the error instead of crashing 500
        error_msg = traceback.format_exc()
        print(f"CRITICAL ERROR: {error_msg}")
        return {
                'warning': {
                    'text': f"SYSTEM ERROR: {str(e)}",
                    'action': 'call_admin'
                }
            }