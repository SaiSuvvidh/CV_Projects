import cv2
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
