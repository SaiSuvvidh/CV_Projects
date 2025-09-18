""" import cv2
import mediapipe as mp

class HandDetector:
    def __init__(self, detectionConfidence=0.5, maxHands=2):
        self.hands = mp.solutions.hands.Hands(
            static_image_mode=False,
            max_num_hands=maxHands,
            min_detection_confidence=detectionConfidence,
            min_tracking_confidence=0.5
        )
        self.mpDraw = mp.solutions.drawing_utils
        self.results = None

    def findHands(self, img):
        imgRGB = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        self.results = self.hands.process(imgRGB)
        return img

    def findPosition(self, img, handNo=0):
        lmList = []
        if self.results.multi_hand_landmarks:
            if handNo < len(self.results.multi_hand_landmarks):
                hand = self.results.multi_hand_landmarks[handNo]
                for id, lm in enumerate(hand.landmark):
                    h, w, c = img.shape
                    cx, cy = int(lm.x * w), int(lm.y * h)
                    lmList.append((id, cx, cy))
        return lmList


def run():
    cap = cv2.VideoCapture(0)
    cap.set(3, 1280)
    cap.set(4, 720)

    detector = HandDetector(detectionConfidence=0.8, maxHands=2)

    ball_pos = [640, 360]
    ball_speed = [8, 8]
    ball_radius = 10

    paddle_w, paddle_h = 150, 20
    paddle_top_x = 565
    paddle_bottom_x = 565

    while True:
        success, img = cap.read()
        img = cv2.flip(img, 1)

        img = detector.findHands(img)

        # Default positions
        top_finger = None
        bottom_finger = None

        if detector.results.multi_hand_landmarks:
            for i, _ in enumerate(detector.results.multi_hand_landmarks):
                lmList = detector.findPosition(img, i)
                if lmList:
                    _, cx, cy = lmList[8]  # Index fingertip
                    # Decide top or bottom player based on y
                    if cy < 360:
                        top_finger = (cx, cy)
                        paddle_top_x = cx - paddle_w // 2
                        cv2.circle(img, (cx, cy), 8, (0, 0, 255), cv2.FILLED)
                    else:
                        bottom_finger = (cx, cy)
                        paddle_bottom_x = cx - paddle_w // 2
                        cv2.circle(img, (cx, cy), 8, (0, 255, 0), cv2.FILLED)

        # Update ball position
        ball_pos[0] += ball_speed[0]
        ball_pos[1] += ball_speed[1]

        # Bounce left/right
        if ball_pos[0] - ball_radius <= 0 or ball_pos[0] + ball_radius >= 1280:
            ball_speed[0] = -ball_speed[0]

        # Paddle collision bottom
        if (paddle_bottom_x < ball_pos[0] < paddle_bottom_x + paddle_w) and \
           (650 < ball_pos[1] + ball_radius < 650 + paddle_h):
            ball_speed[1] = -ball_speed[1]

        # Paddle collision top
        if (paddle_top_x < ball_pos[0] < paddle_top_x + paddle_w) and \
           (50 < ball_pos[1] - ball_radius < 50 + paddle_h):
            ball_speed[1] = -ball_speed[1]

        # Missed paddle → reset ball
        if ball_pos[1] - ball_radius <= 0 or ball_pos[1] + ball_radius >= 720:
            ball_pos = [640, 360]
            ball_speed = [8, 8]

        # Draw paddles
        cv2.rectangle(img, (paddle_top_x, 50), (paddle_top_x + paddle_w, 50 + paddle_h), (0, 0, 255), -1)
        cv2.rectangle(img, (paddle_bottom_x, 650), (paddle_bottom_x + paddle_w, 650 + paddle_h), (0, 255, 0), -1)

        # Draw ball
        cv2.circle(img, tuple(ball_pos), ball_radius, (0, 255, 255), -1)

        cv2.imshow("Multiplayer Offline", img)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
 """
import cv2
import mediapipe as mp
import numpy as np

# Hand tracking setup
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(max_num_hands=2, min_detection_confidence=0.7)
mp_draw = mp.solutions.drawing_utils

# Webcam setup
cap = cv2.VideoCapture(0)
cap.set(3, 640)
cap.set(4, 480)

# Game variables
ball_pos = [320, 240]
ball_speed = [4, 4]
paddle_height = 100
paddle_width = 15
left_paddle_y = 240
right_paddle_y = 240
score_left = 0
score_right = 0

while True:
    success, frame = cap.read()
    if not success:
        break

    # Flip feed like a mirror
    frame = cv2.flip(frame, 1)
    h, w, _ = frame.shape
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # Detect hands
    results = hands.process(rgb)
    if results.multi_hand_landmarks and results.multi_handedness:
        for hand_landmarks, handedness in zip(results.multi_hand_landmarks, results.multi_handedness):
            cx = int(hand_landmarks.landmark[8].x * w)  # index fingertip X
            cy = int(hand_landmarks.landmark[8].y * h)  # index fingertip Y

            if handedness.classification[0].label == "Left":
                left_paddle_y = max(0, min(h - paddle_height, cy - paddle_height // 2))
            else:
                right_paddle_y = max(0, min(h - paddle_height, cy - paddle_height // 2))

    # --- Ball update ---
    ball_pos[0] += ball_speed[0]
    ball_pos[1] += ball_speed[1]

    # Bounce on top/bottom
    if ball_pos[1] <= 0 or ball_pos[1] >= h:
        ball_speed[1] *= -1

    # Bounce on paddles
    if (ball_pos[0] <= paddle_width and 
        left_paddle_y < ball_pos[1] < left_paddle_y + paddle_height):
        ball_speed[0] *= -1

    if (ball_pos[0] >= w - paddle_width and 
        right_paddle_y < ball_pos[1] < right_paddle_y + paddle_height):
        ball_speed[0] *= -1

    # Score check
    if ball_pos[0] < 0:
        score_right += 1
        ball_pos = [w // 2, h // 2]
    elif ball_pos[0] > w:
        score_left += 1
        ball_pos = [w // 2, h // 2]

    # --- Draw paddles and ball ---
    cv2.rectangle(frame, (0, left_paddle_y), (paddle_width, left_paddle_y + paddle_height), (255, 0, 0), -1)
    cv2.rectangle(frame, (w - paddle_width, right_paddle_y), (w, right_paddle_y + paddle_height), (0, 0, 255), -1)
    cv2.circle(frame, tuple(map(int, ball_pos)), 8, (0, 255, 0), -1)  # smaller ball

    # --- Draw scores ---
    cv2.putText(frame, f"{score_left}", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (255,255,255), 2)
    cv2.putText(frame, f"{score_right}", (w-100, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (255,255,255), 2)

    # Show frame
    cv2.imshow("CV Pong", frame)

    # Quit on 'q'
    key = cv2.waitKey(1) & 0xFF
    if key == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
