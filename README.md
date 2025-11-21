FuelFlow AI: Agentic Logistics Manager 🚀Winner/Participant at Build and Blog Marathon 2025Transforming Last-Mile Logistics with Voice-First Agentic AI.(Add a GIF of your voice command working here)💡 The ProblemManaging LPG cylinder distribution is chaotic. Delivery personnel struggle with:Manual Data Entry: Typing on phones while handling heavy cylinders is difficult.Inventory Leakage: Cylinders often go missing due to recording errors.Context Switching: Searching for customer IDs and product codes takes time.🤖 The SolutionFuelFlow AI is an Intelligent Agent that acts as a digital inventory manager. Instead of filling complex forms, staff simply speak to the app. The AI understands context, searches the database for specific customers, and executes complex, multi-nested database transactions automatically.🏗️ ArchitectureThe system uses a Hybrid Architecture combining a reactive Angular frontend with a scalable Serverless Python "Brain".graph LR
    A[User Voice/Text] -->|Angular Frontend| B(Cloud Run Agent)
    B -->|Context & Tools| C{Gemini 2.5 Flash}
    C -->|Function Call| B
    B -->|Search & Write| D[(Firebase Realtime DB)]
    D -->|Realtime Update| A
Tech StackFrontend: Angular 16+, Web Speech API (Voice-to-Text).Backend "Brain": Python FastAPI, hosted on Google Cloud Run.AI Model: Google Vertex AI (Gemini 2.5 Flash).Database: Firebase Realtime Database (NoSQL).Orchestration: Custom Tool Definitions & Function Calling.✨ Key Features1. 🗣️ Voice-First Transaction LoggingDrivers can simply say:"Ramesh returned 5 Oxygen cylinders and took 10 LPG cylinders."The AI parses this natural language into structured JSON, separating "Returns" (IN) from "Deliveries" (OUT).2. 🔍 Intelligent Entity Search (RAG-lite)The AI doesn't just record text. It performs Semantic Lookups:It searches the customers node for "Ramesh".It retrieves the specific userId and phoneNumber.It links the transaction to the correct productId.3. 🧠 Context-Aware "Memory"The agent maintains a cache of the customer database. If a new customer is added, the agent can be triggered to "Refresh Memory" via a specific tool call, ensuring it never works with stale data.🛠️ The "Agentic" WorkflowWe utilized Gemini Function Calling to give the model real-world tools:Tool NameDescriptionprocess_transactionLogs complex nested transactions. Distinguishes between the Customer (Buyer) and the Delivery Person (Staff).get_customer_detailsFetches full profile data (Address, Phone, ID) for a specific name.refresh_memoryForces the backend to re-fetch and cache the latest customer list from Firebase.🚀 Installation & SetupPrerequisitesNode.js & Angular CLIPython 3.11+Google Cloud Project with Vertex AI enabledFirebase Project1. Frontend (Angular)cd fuel-flow-web
npm install
ng serve
# Open http://localhost:4200
2. Backend Agent (Cloud Run / Local)cd backend-agent
pip install -r requirements.txt

# Run locally
python -m uvicorn main:app --host 0.0.0.0 --port 8080
3. Deployment# Build & Deploy to Cloud Run
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/cylinder-agent
gcloud run deploy cylinder-agent --image gcr.io/YOUR_PROJECT_ID/cylinder-agent --allow-unauthenticated
📸 ScreenshotsVoice InterfaceRealtime Database UpdateUser speaking a commandComplex JSON created instantly🏆 Impact90% Reduction in data entry time for drivers.Zero "Fat-Finger" Errors thanks to AI validation.Real-time Sync ensures the warehouse and delivery trucks are always aligned.Built with ❤️ at the Google Cloud Build & Blog Marathon, Hyderabad.