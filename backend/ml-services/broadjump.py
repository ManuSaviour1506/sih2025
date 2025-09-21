import cv2
import mediapipe as mp
import math
import json
import sys

def analyze_broad_jump(video_path):
    mp_pose = mp.solutions.pose
    pose = mp.solutions.pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        return {"error": f"Could not open video file: {video_path}"}
    
    # We need a fixed calibration. This is a key assumption for an automated system.
    # We will assume a consistent setup where 1 pixel = 0.05 cm.
    pixels_per_cm = 20
    take_off_line_x = 350
    foul_threshold_pixels = 15
    
    jump_state = "READY"
    max_jump_pixels = 0
    landing_x = 0
    hip_landed_x = 0
    is_foul = False
    
    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            break

        h, w, _ = frame.shape
        image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(image_rgb)

        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark
            
            left_hip = landmarks[mp_pose.PoseLandmark.LEFT_HIP]
            right_hip = landmarks[mp_pose.PoseLandmark.RIGHT_HIP]
            left_heel = landmarks[mp_pose.PoseLandmark.LEFT_HEEL]
            right_heel = landmarks[mp_pose.PoseLandmark.RIGHT_HEEL]
            
            if left_hip.visibility > 0.5 and right_hip.visibility > 0.5 and left_heel.visibility > 0.5 and right_heel.visibility > 0.5:
                hip_x = int((left_hip.x + right_hip.x) * w / 2)
                rearmost_heel_x = int(min(left_heel.x, right_heel.x) * w)

                if jump_state == "READY" and hip_x > take_off_line_x:
                    jump_state = "JUMPING"
                
                elif jump_state == "JUMPING":
                    current_jump_pixels = rearmost_heel_x - take_off_line_x
                    if current_jump_pixels > max_jump_pixels:
                        max_jump_pixels = current_jump_pixels
                        landing_x = rearmost_heel_x
                    
                    if hip_x < (take_off_line_x + max_jump_pixels):
                        jump_state = "LANDED"
                        hip_landed_x = hip_x
                
                elif jump_state == "LANDED":
                    # Simple foul check: if hips move backward after landing
                    if hip_x < hip_landed_x - foul_threshold_pixels:
                        is_foul = True
                    jump_state = "MEASURED"

    cap.release()
    pose.close()
    
    if is_foul:
        final_distance_cm = 0
        status = "FOUL"
    else:
        final_distance_cm = (max_jump_pixels / pixels_per_cm)
        status = "SUCCESS"

    return {
        "testType": "Broad Jump",
        "result": f"{final_distance_cm:.2f} cm",
        "score_cm": round(final_distance_cm, 2),
        "status": status,
        "cheatDetected": is_foul,
        "anomalies": ["Jump foul detected"] if is_foul else []
    }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        video_path = sys.argv[1]
        result = analyze_broad_jump(video_path)
        print(json.dumps(result))
    else:
        print(json.dumps({"error": "No video path provided."}))