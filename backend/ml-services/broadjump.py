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
import math # import

# --- ImageKit Credentials and Upload Function (Same as above) ---
IK_PRIVATE_KEY = "your_imagekit_private_key"
IK_PUBLIC_KEY = "your_imagekit_public_key"
IK_URL_ENDPOINT = "your_imagekit_url_endpoint"

def upload_to_imagekit(file_path):
    try:
        url = f"https://upload.imagekit.io/api/v1/files/upload"
        headers = {'Authorization': f'Bearer {IK_PRIVATE_KEY}'}
        
        with open(file_path, 'rb') as f:
            response = requests.post(url, files={'file': f}, data={
                'fileName': f"broad_jump_{datetime.now().strftime('%Y%m%d%H%M%S')}.mp4",
                'folder': 'analyzed-videos'
            })
            response.raise_for_status()
            return response.json().get('url')

    except requests.exceptions.RequestException as e:
        print(f"Failed to upload to ImageKit: {e}", file=sys.stderr)
        return None

def analyze_broad_jump(video_path):
    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        return {"error": "Could not open video file."}

    # --- Analysis Variables ---
    start_point = None
    end_point = None
    max_distance_pixels = 0
    
    # --- Video Writer Setup ---
    temp_output_video_path = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False).name
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    out = cv2.VideoWriter(temp_output_video_path, fourcc, fps, (width, height))
    
    # --- Main Analysis and Rendering Loop ---
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(frame_rgb)
        
        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark
            
            # Use ankle landmarks to track jump
            left_ankle = landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value]
            right_ankle = landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value]
            
            # Set start point when feet are on the ground
            if start_point is None and left_ankle.y > 0.8 and right_ankle.y > 0.8:
                start_point = (left_ankle.x, left_ankle.y)
            
            # Get the end point when feet land
            if start_point is not None and left_ankle.y < 0.7 and right_ankle.y < 0.7:
                 end_point = (left_ankle.x, left_ankle.y)
                 
            # Calculate distance if both points are available
            if start_point and end_point:
                dx = end_point[0] - start_point[0]
                dy = end_point[1] - start_point[1]
                distance = math.sqrt(dx**2 + dy**2)
                max_distance_pixels = max(max_distance_pixels, distance)

            # --- Draw landmarks and text on the frame ---
            mp.solutions.drawing_utils.draw_landmarks(frame, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)
            
            # Display the distance
            cv2.putText(frame, f'Distance: {max_distance_pixels:.2f} px', (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 0), 2, cv2.LINE_AA)
            
        out.write(frame)
        
    cap.release()
    out.release()
    pose.close()

    # --- Final Score and Upload ---
    final_score = round(max_distance_pixels, 2)
    analyzed_video_url = upload_to_imagekit(temp_output_video_path)
    
    if os.path.exists(temp_output_video_path):
        os.remove(temp_output_video_path)

    return {
        "testType": "Broad Jump",
        "result": { "distance_pixels": final_score },
        "score": final_score,
        "analyzedVideoUrl": analyzed_video_url
    }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        video_path = sys.argv[1]
        result = analyze_broad_jump(video_path)
        print(json.dumps(result))
    else:
        print(json.dumps({"error": "No video path provided"}))