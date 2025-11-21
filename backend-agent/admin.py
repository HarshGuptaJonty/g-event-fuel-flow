from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from firebase_admin import credentials, db

ADMIN_CACHE = {}

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
    print(f"Firebase Init Error in ADMIN: {e}")

def refresh_admin_cache():
    """Fetches all admins from /admin and stores them in memory"""
    global ADMIN_CACHE
    try:
        print("Refreshing Admin Cache...")
        ref = db.reference('admin')
        snapshot = ref.get()
        if snapshot:
            ADMIN_CACHE = snapshot
            print(f"Loaded {len(snapshot)} admins.")
        else:
            print("No admins found in admin")
    except Exception as e:
        print(f"Error fetching admins: {e}")

refresh_admin_cache()

def find_admin_by_name(search_name):
    """Searches the in-memory cache for an admin name"""
    if not search_name: return None
    
    # If cache is empty, try to refresh it once
    if not ADMIN_CACHE:
        refresh_admin_cache()

    search_lower = search_name.lower()
    search_response = []

    # Iterate through the bucket structure
    # Structure: { "USER_ID": { "data": { "fullName": "...", ... }, "others": ... } }
    for user_id, record in ADMIN_CACHE.items():
        user_data = record.get('data', {})
        full_name = user_data.get('fullName', '')
        
        # Check for name match
        if full_name and search_lower in full_name.lower():
            search_response.append(user_data)
        
    return search_response if len(search_response) > 0 else None 
    # Returns the inner 'data' object which has userId, address, etc.

def execute_get_admin_details(admin_name):
    """Logic to search cache and return object"""
    admin = find_admin_by_name(admin_name)
    if admin:
        # Convert dict to pretty string or return raw JSON
        return {
                'objectArray': admin,
                'action': 'click_to_redirect' 
            }
    else:
        return {
            'warning': {
                'text': f"No admin named '{admin_name}' in bucket. Please let me know if I need to refresh my memory.",
                'action': 'refresh_memory'
            }
        }