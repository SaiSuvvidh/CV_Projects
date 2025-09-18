import cv2
import numpy as np
import mediapipe as mp
import csv
import datetime
from collections import deque
import time

# Initialize mediapipe face mesh
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(static_image_mode=False, max_num_faces=1, refine_landmarks=True)

# Define 3D model points of key landmarks
model_points = np.array([q
    (0.0, 0.0, 0.0),             # Nose tip
    (0.0, -330.0, -65.0),        # Chin
    (-225.0, 170.0, -135.0),     # Left eye left corner
    (225.0, 170.0, -135.0),      # Right eye right corner
    (-150.0, -150.0, -125.0),    # Left mouth corner
    (150.0, -150.0, -125.0)      # Right mouth corner
])

# Corresponding indices in MediaPipe's 468-point face mesh
LANDMARK_IDS = {
    "nose_tip": 1,
    "chin": 152,
    "left_eye_left_corner": 263,
    "right_eye_right_corner": 33,
    "left_mouth_corner": 287,
    "right_mouth_corner": 57
}

# Initialize variables for temporal smoothing
pitch_vals = deque(maxlen=5)
yaw_vals = deque(maxlen=5)
roll_vals = deque(maxlen=5)

# Initialize variables for FPS calculation and distraction tracking
prev_frame_time = 0
distraction_counter = 0

# Try different camera indices
def try_camera_indices():
    for index in range(2):  # Try first two camera indices
        cap = cv2.VideoCapture(index)
        if cap.isOpened():
            ret, test_frame = cap.read()
            if ret:
                print(f"Successfully opened camera at index {index}")
                return cap
            cap.release()
    return None

# Start webcam
cap = try_camera_indices()

# Check if camera opened successfully
if cap is None:
    print("Error: Could not open camera.")
    exit()

# Try to get a frame to ensure camera is working
ret, test_frame = cap.read()
if not ret:
    print("Error: Could not read frame from camera.")
    cap.release()
    exit()

print("Camera initialized successfully. Press 'q' or 'ESC' to exit.")

# Set camera properties for better performance
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    h, w = frame.shape[:2]
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(rgb)

    if results.multi_face_landmarks:
        face_landmarks = results.multi_face_landmarks[0].landmark

        # Get 2D image points
        image_points = np.array([
            (face_landmarks[LANDMARK_IDS["nose_tip"]].x * w, face_landmarks[LANDMARK_IDS["nose_tip"]].y * h),
            (face_landmarks[LANDMARK_IDS["chin"]].x * w, face_landmarks[LANDMARK_IDS["chin"]].y * h),
            (face_landmarks[LANDMARK_IDS["left_eye_left_corner"]].x * w, face_landmarks[LANDMARK_IDS["left_eye_left_corner"]].y * h),
            (face_landmarks[LANDMARK_IDS["right_eye_right_corner"]].x * w, face_landmarks[LANDMARK_IDS["right_eye_right_corner"]].y * h),
            (face_landmarks[LANDMARK_IDS["left_mouth_corner"]].x * w, face_landmarks[LANDMARK_IDS["left_mouth_corner"]].y * h),
            (face_landmarks[LANDMARK_IDS["right_mouth_corner"]].x * w, face_landmarks[LANDMARK_IDS["right_mouth_corner"]].y * h)
        ], dtype="double")

        # Camera internals
        focal_length = w
        center = (w / 2, h / 2)
        camera_matrix = np.array([
            [focal_length, 0, center[0]],
            [0, focal_length, center[1]],
            [0, 0, 1]
        ], dtype="double")

        dist_coeffs = np.zeros((4, 1))

        # Solve PnP
        success, rotation_vector, translation_vector = cv2.solvePnP(
            model_points, image_points, camera_matrix, dist_coeffs, flags=cv2.SOLVEPNP_ITERATIVE)

        # Convert rotation vector to rotation matrix and euler angles
        rotation_matrix, _ = cv2.Rodrigues(rotation_vector)
        euler_angles = cv2.RQDecomp3x3(rotation_matrix)[0]
        
        # Convert angles to degrees and apply temporal smoothing
        pitch_vals.append(euler_angles[0])
        yaw_vals.append(euler_angles[1])
        roll_vals.append(euler_angles[2])
        
        pitch = sum(pitch_vals) / len(pitch_vals)
        yaw = sum(yaw_vals) / len(yaw_vals)
        roll = sum(roll_vals) / len(roll_vals)

        # Project forward direction (e.g. nose direction)
        (nose_end_point2D, _) = cv2.projectPoints(
            np.array([(0.0, 0.0, 1000.0)]),
            rotation_vector,
            translation_vector,
            camera_matrix,
            dist_coeffs)
            
        # Add text based on head orientation
        text = ""
        if yaw < -20 or yaw > 20:  # Looking sideways - adjusted threshold
            text = "Distracted - Looking Sideways"
            distraction_counter += 1
        elif pitch > 15:  # Adjusted threshold for looking down
            text = "Distracted - Looking Down"
            distraction_counter += 1
        elif pitch < -15:  # Adjusted threshold for looking up
            text = "Distracted - Looking Up"
            distraction_counter += 1
        else:
            text = "Focused"  # Added neutral position indicator
            distraction_counter = 0
            
        # Log head direction
        with open('head_pose_log.csv', mode='a', newline='') as file:
            writer = csv.writer(file)
            writer.writerow([datetime.datetime.now(), text])

        # Display text and distraction warning
        if text:
            cv2.putText(frame, text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        
        if distraction_counter > 30:  # ~1 second at 30 fps
            cv2.putText(frame, "Distracted!", (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)

        # Display angles for debugging
        angle_text = f"Pitch: {pitch:.1f}, Yaw: {yaw:.1f}, Roll: {roll:.1f}"
        cv2.putText(frame, angle_text, (10, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)

        # Calculate and display FPS
        current_time = time.time()
        fps = 1 / (current_time - prev_frame_time)
        prev_frame_time = current_time
        cv2.putText(frame, f"FPS: {fps:.1f}", (10, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)


    cv2.imshow('MediaPipe Head Pose Estimation', frame)
    key = cv2.waitKey(1) & 0xFF
    if key == ord('q') or key == 27:  # Press 'q' or ESC to exit
        break

cap.release()
cv2.destroyAllWindows()