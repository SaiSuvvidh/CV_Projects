import cv2
import numpy as np
import mediapipe as mp

# Initialize mediapipe face mesh
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(static_image_mode=False, max_num_faces=1, refine_landmarks=True)

# Define 3D model points of key landmarks
model_points = np.array([
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
        
        # Convert angles to degrees
        pitch = euler_angles[0]
        yaw = euler_angles[1]
        roll = euler_angles[2]

        # Project forward direction (e.g. nose direction)
        (nose_end_point2D, _) = cv2.projectPoints(
            np.array([(0.0, 0.0, 1000.0)]),
            rotation_vector,
            translation_vector,
            camera_matrix,
            dist_coeffs)
            
        # Add text based on head orientation
        text = ""
        if yaw < -15:
            text = "Turned Right"
        elif yaw > 15:
            text = "Turned Left"
        elif pitch < -10:
            text = "Looking Up"
        elif pitch > 10:
            text = "Looking Down"
            
        if text:
            cv2.putText(frame, text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

        p1 = (int(image_points[0][0]), int(image_points[0][1]))
        p2 = (int(nose_end_point2D[0][0][0]), int(nose_end_point2D[0][0][1]))
        cv2.line(frame, p1, p2, (255, 0, 0), 3)

        # Optional: Draw landmarks
        for pt in image_points:
            cv2.circle(frame, (int(pt[0]), int(pt[1])), 4, (0, 255, 0), -1)

    cv2.imshow('MediaPipe Head Pose Estimation', frame)
    key = cv2.waitKey(1) & 0xFF
    if key == ord('q') or key == 27:  # Press 'q' or ESC to exit
        break

cap.release()
cv2.destroyAllWindows()