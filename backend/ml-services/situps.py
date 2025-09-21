import cv2
import mediapipe as mp
import numpy as np
import json
import sys
import tempfile
import requests
import os
import urllib.parse
from datetime import datetime

# --- ✅ NEW: ImageKit Credentials (for a more complete example) ---
# It's best practice to use environment variables for these
# For this example, replace with your actual values or manage with a config file
IK_PRIVATE_KEY = "your_imagekit_private_key"
IK_PUBLIC_KEY = "your_imagekit_public_key"
IK_URL_ENDPOINT = "your_imagekit_url_endpoint"

# --- ✅ NEW: Function to upload a file to ImageKit ---
def upload_to_imagekit(file_path):
    try:
        url = f"https://upload.imagekit.io/api/v1/files/upload"
        
        # Get a signed URL for a secure upload
        # This requires a backend endpoint to provide a signed token, expire, and signature.
        # For a full-stack implementation, your Node.js backend would provide these.
        # For this standalone script, we'll use a placeholder.
        # A real implementation might use ImageKit's SDK to generate the signature.
        
        # In a more realistic scenario, this part would be handled by the Node.js backend.
        # The Python script would receive a signed URL and upload directly.
        # We will use a simplified direct upload for this example, which requires authentication.
        
        # Simplified direct upload for demonstration (might not be secure for production)
        headers = {'Authorization': f'Bearer {IK_PRIVATE_KEY}'}
        
        with open(file_path, 'rb') as f:
            response = requests.post(url, files={'file': f}, data={
                'fileName': os.path.basename(file_path),
                'folder': 'analyzed-videos'
            })
            response.raise_for_status()
            
            return response.json().get('url')

    except requests.exceptions.RequestException as e:
        print(f"Failed to upload to ImageKit: {e}", file=sys.stderr)
        return None

# Helper function to calculate angle between three points
def calculate_angle(a, b, c):
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)
    
    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    if angle > 180.0:
        angle = 360 - angle
    return angle

def analyze_situps(video_path):
    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)
    cap = cv2.VideoCapture(video_path)

    count = 0
    is_up = False
    cheat_detected = False
    anomalies = []
    
    # --- ✅ NEW: Video Writer Setup ---
    temp_output_video_path = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False).name
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    out = cv2.VideoWriter(temp_output_video_path, fourcc, fps, (width, height))
    
    # --- ✅ NEW: Main Analysis and Rendering Loop ---
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(frame_rgb)

        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark
            
            # Keypoints for sit-up analysis (using left side for consistency)
            hip = [landmarks[mp_pose.PoseLandmark.LEFT_HIP].x, landmarks[mp_pose.PoseLandmark.LEFT_HIP].y]
            shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER].x, landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER].y]
            knee = [landmarks[mp_pose.PoseLandmark.LEFT_KNEE].x, landmarks[mp_pose.PoseLandmark.LEFT_KNEE].y]
            ankle = [landmarks[mp_pose.PoseLandmark.LEFT_ANKLE].x, landmarks[mp_pose.PoseLandmark.LEFT_ANKLE].y]
            elbow = [landmarks[mp_pose.PoseLandmark.LEFT_ELBOW].x, landmarks[mp_pose.PoseLandmark.LEFT_ELBOW].y]
            
            # Torso angle to count reps
            torso_angle = calculate_angle(shoulder, hip, knee)
            
            # Cheat Detection: Foot lift from the ground
            if abs(ankle[1] - hip[1]) > 0.1:
                if "Foot lift" not in anomalies:
                    anomalies.append("Foot lift detected.")
                cheat_detected = True

            # Cheat Detection: Hands pulling on head (elbows too close to head)
            if abs(elbow[0] - shoulder[0]) < 0.05:
                if "Hands pulling on head" not in anomalies:
                    anomalies.append("Hands pulling on head detected.")
                cheat_detected = True

            # Rep counting logic
            if torso_angle < 100 and not is_up:
                is_up = True
            elif torso_angle > 160 and is_up:
                count += 1
                is_up = False
                
            # --- ✅ NEW: Draw landmarks on the frame ---
            mp.solutions.drawing_utils.draw_landmarks(frame, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)
            
            # Draw sit-up count on the screen
            cv2.putText(frame, f'Reps: {count}', (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 0), 2, cv2.LINE_AA)
            
            # Draw cheat detection
            if cheat_detected:
                cv2.putText(frame, 'CHEATING DETECTED!', (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2, cv2.LINE_AA)
            
            # Write the rendered frame to the output video file
            out.write(frame)
    
    cap.release()
    out.release()
    pose.close()

    # --- ✅ NEW: Upload the analyzed video and get the URL ---
    analyzed_video_url = upload_to_imagekit(temp_output_video_path)
    
    # --- ✅ NEW: Clean up the temporary video file on the server ---
    if os.path.exists(temp_output_video_path):
        os.remove(temp_output_video_path)
    
    # --- ✅ NEW: Define the final score for the leaderboard ---
    final_score = count if not cheat_detected else 0 # Penalize cheats
    
    # --- ✅ NEW: Return the full analysis result ---
    return {
        "testType": "Sit Ups",
        "result": { 
            "count": count, 
            "cheatDetected": cheat_detected, 
            "anomalies": anomalies 
        },
        "score": final_score,
        "analyzedVideoUrl": analyzed_video_url
    }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        video_path = sys.argv[1]
        result = analyze_situps(video_path)
        print(json.dumps(result))
    else:
        print(json.dumps({"error": "No video path provided"}))