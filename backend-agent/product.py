from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from firebase_admin import credentials, db

PRODUCT_CACHE = {}

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

def refresh_product_cache():
    """Fetches all product from productList and stores them in memory"""
    global PRODUCT_CACHE
    try:
        print("Refreshing productList Cache...")
        ref = db.reference('productList')
        snapshot = ref.get()
        if snapshot:
            PRODUCT_CACHE = snapshot
            print(f"Loaded {len(snapshot)} productLists.")
        else:
            print("No productLists found in productList")
    except Exception as e:
        print(f"Error fetching productLists: {e}")

refresh_product_cache()

def find_product_by_name(search_name):
    """Searches the in-memory cache for a product name"""
    if not search_name: return None
    
    # If cache is empty, try to refresh it once
    if not PRODUCT_CACHE:
        refresh_product_cache()

    search_lower = search_name.lower()
    search_response = []
    
    # Iterate through the bucket structure
    # Structure: { "PRODUCT_ID": { "data": { "name": "...", ... }, "others": ... } }
    for product_id, record in PRODUCT_CACHE.items():
        product_data = record.get('data', {})
        name = product_data.get('name', '')
        
        # Check for name match
        if name and search_lower in name.lower():
            search_response.append(product_data)
        
    return search_response if len(search_response) > 0 else None 
    # Returns the inner 'data' object which has userId, address, etc.

def execute_get_product_details(product_name):
    """Logic to search cache and return object"""
    product = find_product_by_name(product_name)
    if product:
        # Convert dict to pretty string or return raw JSON
        return {
                'objectArray': product,
                'action': 'click_to_redirect'
            }
    else:
        return {
            'warning': {
                'text': f"No product named '{product_name}' in bucket. Please let me know if I need to refresh my memory.",
                'action': 'refresh_memory'
            }
        }