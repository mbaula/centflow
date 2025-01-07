# centflow 📚

I made centflow so I can add my centennial courses to my google calendar without having to manually add each course.

centflow solves these problems by:
- Parsing your course schedule directly from mycentennial
- Creating a separate calendar for your courses
- Color-coding different courses for better visibility
- Handling recurring classes automatically
- Supporting both lectures and labs

## Setup Guide 🚀

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- A Google account

### 1. Clone the Repository
```
git clone https://github.com/your-repo/centflow.git
cd centflow
```

### 2. Install Dependencies
```bash
npm install
```


### 3. Set Up Google Calendar API
1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (e.g., "Centflow")
3. Enable the Google Calendar API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"
4. Set up OAuth 2.0:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized JavaScript origins:
     - `http://localhost:3000` (for development)
   - Add authorized redirect URIs:
     - `http://localhost:3000`
5. Copy your Client ID

### 4. Configure Environment Variables
1. Create a `.env.local` file in the root directory
2. Make the following changes:
    ```
    NEXT_PUBLIC_GOOGLE_CLIENT_ID= YOUR_CLIENT_ID
    GOOGLE_CLIENT_SECRET= YOUR_CLIENT_SECRET
    ```

### 5. Run the Development Server
```
npm run dev
```


### 6. Use Centflow
1. Open `http://localhost:3000` in your browser
2. Follow the instructions to copy your schedule from mycentennial
3. Paste it into Centflow
4. Click "Parse Schedule" to see your courses
5. Review the parsed events and make any necessary adjustments
6. Click "Add to Google Calendar" to import your schedule

## Features ✨

- 📋 Easy copy-paste from mycentennial
- 🎨 Color-coded courses
- 🔄 Automatic handling of recurring classes
- 📅 Separate calendar creation
- ✏️ Edit capabilities before adding to calendar
- 📱 Responsive design