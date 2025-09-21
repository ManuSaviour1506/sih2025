import cv2
import mediapipe as mp
import time

def analyze_shuttle_run(video_path):
    mp_pose = mp.solutions.pose
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        return {"error": "Could not open video file."}

    start_time = time.time()
    laps = 0
    laps_completed = False
    
    # Define a virtual line. Let's assume the athlete runs left-to-right on screen.
    # The line can be a vertical line at a certain x-coordinate. Adjust this value based on your video's setup.
    line_x = 320 # A sample x-coordinate for the virtual line

    with mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            # Convert the frame to RGB for MediaPipe
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose.process(frame_rgb)
            
            if results.pose_landmarks:
                landmarks = results.pose_landmarks.landmark
                # Use a landmark like the right heel (landmark 32)
                right_heel = landmarks[mp_pose.PoseLandmark.RIGHT_HEEL.value]

                # Check if the heel landmark crosses the line
                if right_heel.x * frame.shape[1] > line_x and not laps_completed:
                    laps += 1
                    laps_completed = True
                elif right_heel.x * frame.shape[1] < line_x and laps_completed:
                    laps_completed = False

    end_time = time.time()
    total_time = end_time - start_time
    cap.release()
    cv2.destroyAllWindows()

    return {
        "laps_completed": laps,
        "total_time_seconds": round(total_time, 2),
        "test_type": "Shuttle Run"
    }

if __name__ == '__main__':
    # For testing purposes, you can replace 'test_video.mp4' with your video file path
    result = analyze_shuttle_run('test_video.mp4')
    print(result)