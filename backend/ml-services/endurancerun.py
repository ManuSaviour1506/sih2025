import cv2
import mediapipe as mp
import time
import math

def analyze_endurance_run(video_path):
    mp_pose = mp.solutions.pose
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        return {"error": "Could not open video file."}

    total_distance_pixels = 0
    prev_hip_pos = None

    with mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose.process(frame_rgb)

            if results.pose_landmarks:
                landmarks = results.pose_landmarks.landmark
                # Use a stable landmark like the right hip (landmark 24)
                right_hip = landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value]
                
                current_hip_pos = (right_hip.x, right_hip.y)
                
                if prev_hip_pos:
                    # Calculate the distance moved since the last frame
                    dx = current_hip_pos[0] - prev_hip_pos[0]
                    dy = current_hip_pos[1] - prev_hip_pos[1]
                    distance = math.sqrt(dx**2 + dy**2)
                    total_distance_pixels += distance
                
                prev_hip_pos = current_hip_pos
                
    cap.release()
    cv2.destroyAllWindows()

    # Note: This is an estimation in pixels. For real-world accuracy,
    # you would need to calibrate it using a known distance in the video.
    # For this project, a pixel-based score is a good start.
    
    return {
        "distance_covered_pixels": round(total_distance_pixels, 2),
        "test_type": "Endurance Run"
    }

if __name__ == '__main__':
    result = analyze_endurance_run('test_video.mp4')
    print(result)