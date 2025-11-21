from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from firebase_admin import credentials, db

DELIVERY_BOY_CACHE = {}

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
    print(f"Firebase Init Error in CUSTOMER: {e}")


def refresh_delivery_boy_cache():
    """Fetches all delivery persom from /deliveryPerson/bucket and stores them in memory"""
    global DELIVERY_BOY_CACHE
    try:
        print("Refreshing delivery Person Cache...")
        ref = db.reference('deliveryPerson/bucket')
        snapshot = ref.get()
        if snapshot:
            DELIVERY_BOY_CACHE = snapshot
            print(f"Loaded {len(snapshot)} delivery persons.")
        else:
            print("No delivery persons found in /deliveryPerson/bucket")
    except Exception as e:
        print(f"Error fetching delivery persons: {e}")

refresh_delivery_boy_cache()

def find_delivery_boy_by_name(search_name):
    """Searches the in-memory cache for a delivery name"""
    if not search_name: return None
    
    # If cache is empty, try to refresh it once
    if not DELIVERY_BOY_CACHE:
        refresh_delivery_boy_cache()

    search_lower = search_name.lower()
    search_response = []
    
    # Iterate through the bucket structure
    # Structure: { "USER_ID": { "data": { "fullName": "...", ... }, "others": ... } }
    for user_id, record in DELIVERY_BOY_CACHE.items():
        user_data = record.get('data', {})
        full_name = user_data.get('fullName', '')
        
        # Check for name match
        if full_name and search_lower in full_name.lower():
            search_response.append(user_data)
        
    return search_response if len(search_response) > 0 else None 
    # Returns the inner 'data' object which has userId, address, etc.

def execute_get_delivery_boy_details(delivery_boy_name):
    """Logic to search cache and return object"""
    delivery = find_delivery_boy_by_name(delivery_boy_name)
    if delivery:
        # Convert dict to pretty string or return raw JSON
        return {
                'objectArray': delivery,
                'action': 'click_to_redirect'
            }
    else:
        return {
            'warning': {
                'text': f"No delivery person named '{delivery_boy_name}' in bucket. Please let me know if I need to refresh my memory.",
                'action': 'refresh_memory'
            }
        }