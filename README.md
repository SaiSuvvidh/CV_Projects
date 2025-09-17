# Proctoring App with Python Face Detection

This is a React-based proctoring application that uses a Python backend for face detection instead of MediaPipe.

## Architecture

- **Frontend**: React + TypeScript + Vite
- **Backend**: Python + Flask + SocketIO + OpenCV/Dlib
- **Communication**: WebSocket for real-time face detection

## Setup Instructions

### 1. Python Backend Setup

#### Install Python Dependencies
```bash
cd backend
pip install -r requirements.txt
```

#### Download Haar Cascade File
Download the Haar cascade file for face detection:
```bash
curl -o haarcascade_frontalface_default.xml https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/haarcascade_frontalface_default.xml
```

#### Install Dlib (Optional but Recommended)
For better face detection accuracy, install Dlib:
```bash
pip install dlib
```

If Dlib installation fails, the app will fallback to OpenCV Haar cascades.

### 2. React Frontend Setup

#### Install Dependencies
```bash
npm install
```

### 3. Running the Application

#### Start Python Backend
```bash
cd backend
python face_detection.py
```
The backend will start on `http://localhost:5000`

#### Start React Frontend
```bash
npm run dev
```
The frontend will start on `http://localhost:5173`

### 4. Access the Application

Open your browser and go to `http://localhost:5173`

## Features

- Real-time face detection using Python backend
- Audio monitoring for speech detection
- Camera and microphone toggling
- Violation logging and tracking
- Responsive UI with dark/light theme

## Troubleshooting

### Backend Connection Issues
- Ensure Python backend is running on port 5000
- Check that all Python dependencies are installed
- Verify Haar cascade file is downloaded

### Face Detection Not Working
- Check console for connection errors
- Ensure camera permissions are granted
- Try refreshing the page if detection stops

### Audio Not Working
- Grant microphone permissions
- Check browser audio settings

## Development

### Adding New Violation Types
1. Update the Python backend detection logic
2. Modify the React hook to handle new violation types
3. Update the UI components to display new violations

### Improving Detection Accuracy
- Fine-tune detection parameters in the Python backend
- Add more sophisticated head pose estimation
- Implement gaze tracking

## Dependencies

### Python Backend
- Flask: Web framework
- Flask-SocketIO: WebSocket support
- OpenCV: Computer vision
- Dlib: Advanced face detection
- NumPy: Numerical operations

### React Frontend
- React: UI framework
- TypeScript: Type safety
- Vite: Build tool
- Socket.IO Client: Backend communication
- Tailwind CSS: Styling
- Framer Motion: Animations
