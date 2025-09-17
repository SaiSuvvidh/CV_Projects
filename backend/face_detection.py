import cv2
import numpy as np
import dlib
import base64
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import threading
import time

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Global variables for face detection
detector = None
face_cascade = None
processing_active = False

def initialize_detectors():
    global detector, face_cascade
    try:
        # Initialize Dlib's frontal face detector
        detector = dlib.get_frontal_face_detector()
        print("Dlib face detector initialized successfully")
    except Exception as e:
        print(f"Dlib initialization failed: {e}")
        detector = None

    try:
        # Initialize OpenCV Haar cascade as fallback
        face_cascade = cv2.CascadeClassifier('haarcascade_frontalface_default.xml')
        if face_cascade.empty():
            print("Warning: Haar cascade file not found or invalid")
            face_cascade = None
        else:
            print("OpenCV Haar cascade initialized successfully")
    except Exception as e:
        print(f"OpenCV Haar cascade initialization failed: {e}")
        face_cascade = None

def detect_faces_opencv(frame):
    """Detect faces using OpenCV Haar cascades"""
    if face_cascade is None:
        return []

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)

    detected_faces = []
    for (x, y, w, h) in faces:
        detected_faces.append({
            'x': int(x),
            'y': int(y),
            'width': int(w),
            'height': int(h),
            'confidence': 0.8  # Haar cascades don't provide confidence
        })

    return detected_faces

def detect_faces_dlib(frame):
    """Detect faces using Dlib"""
    if detector is None:
        return []

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = detector(gray)

    detected_faces = []
    for face in faces:
        x1 = face.left()
        y1 = face.top()
        x2 = face.right()
        y2 = face.bottom()

        detected_faces.append({
            'x': int(x1),
            'y': int(y1),
            'width': int(x2 - x1),
            'height': int(y2 - y1),
            'confidence': 0.9  # Dlib provides good detection
        })

    return detected_faces

def process_frame(frame_data):
    """Process a single frame for face detection"""
    try:
        # Decode base64 image
        img_data = base64.b64decode(frame_data.split(',')[1])
        np_arr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if frame is None:
            return {'error': 'Invalid image data'}

        # Try Dlib first, fallback to OpenCV
        faces = []
        if detector is not None:
            faces = detect_faces_dlib(frame)
        elif face_cascade is not None:
            faces = detect_faces_opencv(frame)
        else:
            return {'error': 'No face detection models available'}

        return {
            'faces': faces,
            'face_count': len(faces),
            'timestamp': time.time()
        }

    except Exception as e:
        return {'error': str(e)}

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'detectors': {
        'dlib': detector is not None,
        'opencv': face_cascade is not None
    }})

@app.route('/detect', methods=['POST'])
def detect_faces():
    try:
        data = request.get_json()
        if not data or 'frame' not in data:
            return jsonify({'error': 'No frame data provided'}), 400

        result = process_frame(data['frame'])
        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@socketio.on('connect')
def handle_connect():
    print('Client connected')
    emit('status', {'message': 'Connected to face detection service'})

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('start_detection')
def handle_start_detection():
    global processing_active
    processing_active = True
    emit('status', {'message': 'Face detection started'})

@socketio.on('stop_detection')
def handle_stop_detection():
    global processing_active
    processing_active = False
    emit('status', {'message': 'Face detection stopped'})

@socketio.on('process_frame')
def handle_process_frame(data):
    if not processing_active:
        return

    if 'frame' in data:
        result = process_frame(data['frame'])
        emit('detection_result', result)

if __name__ == '__main__':
    print("Initializing face detection models...")
    initialize_detectors()

    print("Starting Flask-SocketIO server...")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
