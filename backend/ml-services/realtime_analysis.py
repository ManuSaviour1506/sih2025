import cv2
import mediapipe as mp
import numpy as np
import json
import sys
import base64
import time
from datetime import datetime

# --- Pose Estimation Setup (for all analyzers) ---
mp_pose = mp.solutions.pose
pose_model = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)

# --- Base64 to Image Helper ---
def base64_to_image(base64_string):
    try:
        img_data = base64.b64decode(base64_string)
        np_arr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        print(f"Error decoding image: {e}", file=sys.stderr)
        return None

# --- Central State Manager ---
class StateManager:
    def __init__(self):
        self.state = {}

    def get_state(self, key, default=None):
        return self.state.get(key, default)

    def set_state(self, key, value):
        self.state[key] = value

    def reset_state(self):
        self.state = {}

# --- Base Analyzer Class ---
class BaseAnalyzer:
    def __init__(self, state_manager):
        self.state_manager = state_manager
        self.mp_pose = mp_pose
        self.pose = pose_model
        
    def process_frame(self, frame, landmarks):
        # Override in subclasses
        pass
    
    def get_result(self):
        # Override in subclasses
        pass

# --- Sit Ups Analyzer ---
class SitupsAnalyzer(BaseAnalyzer):
    def __init__(self, state_manager):
        super().__init__(state_manager)
        if self.state_manager.get_state('sit_up_count') is None:
            self.state_manager.set_state('sit_up_count', 0)
            self.state_manager.set_state('is_up', False)
            self.state_manager.set_state('anomalies', [])

    def calculate_angle(self, a, b, c):
        a = np.array(a)
        b = np.array(b)
        c = np.array(c)
        radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
        angle = np.abs(radians * 180.0 / np.pi)
        if angle > 180.0: angle = 360 - angle
        return angle

    def process_frame(self, frame, landmarks):
        # Your Sit Ups logic here, using the state manager
        hip = [landmarks[self.mp_pose.PoseLandmark.LEFT_HIP].x, landmarks[self.mp_pose.PoseLandmark.LEFT_HIP].y]
        shoulder = [landmarks[self.mp_pose.PoseLandmark.LEFT_SHOULDER].x, landmarks[self.mp_pose.PoseLandmark.LEFT_SHOULDER].y]
        knee = [landmarks[self.mp_pose.PoseLandmark.LEFT_KNEE].x, landmarks[self.mp_pose.PoseLandmark.LEFT_KNEE].y]
        
        torso_angle = self.calculate_angle(shoulder, hip, knee)
        
        current_count = self.state_manager.get_state('sit_up_count')
        is_up = self.state_manager.get_state('is_up')
        
        if torso_angle < 100 and not is_up:
            self.state_manager.set_state('is_up', True)
        elif torso_angle > 160 and is_up:
            self.state_manager.set_state('sit_up_count', current_count + 1)
            self.state_manager.set_state('is_up', False)
        
    def get_result(self):
        return {
            "testType": "Sit Ups",
            "score": self.state_manager.get_state('sit_up_count'),
            "result": {"count": self.state_manager.get_state('sit_up_count'), "anomalies": self.state_manager.get_state('anomalies')}
        }

# --- Vertical Jump Analyzer ---
class VerticalJumpAnalyzer(BaseAnalyzer):
    def __init__(self, state_manager):
        super().__init__(state_manager)
        if self.state_manager.get_state('start_height') is None:
            self.state_manager.set_state('start_height', None)
            self.state_manager.set_state('max_height', 0)

    def process_frame(self, frame, landmarks):
        # Vertical Jump logic
        hip_y = (landmarks[self.mp_pose.PoseLandmark.LEFT_HIP].y + landmarks[self.mp_pose.PoseLandmark.RIGHT_HIP].y) / 2
        
        if self.state_manager.get_state('start_height') is None:
            self.state_manager.set_state('start_height', hip_y)
            
        current_jump_height = self.state_manager.get_state('start_height') - hip_y
        
        if current_jump_height > self.state_manager.get_state('max_height'):
            self.state_manager.set_state('max_height', current_jump_height)

    def get_result(self):
        return {
            "testType": "Vertical Jump",
            "score": self.state_manager.get_state('max_height'),
            "result": {"max_height": self.state_manager.get_state('max_height')}
        }

# --- Shuttle Run Analyzer ---
class ShuttleRunAnalyzer(BaseAnalyzer):
    def __init__(self, state_manager):
        super().__init__(state_manager)
        if self.state_manager.get_state('lap_count') is None:
            self.state_manager.set_state('lap_count', 0)
            self.state_manager.set_state('is_running', False)
            self.state_manager.set_state('start_time', 0)
            self.state_manager.set_state('end_time', 0)
            self.state_manager.set_state('is_turning', False)

    def process_frame(self, frame, landmarks):
        # Shuttle Run logic
        wrist_y = landmarks[self.mp_pose.PoseLandmark.RIGHT_WRIST].y
        
        # Conceptual logic based on landmarks and state
        current_laps = self.state_manager.get_state('lap_count')
        
        # Update state based on position and direction
        # This needs a more complex state machine like the file-based version
        if not self.state_manager.get_state('is_running'):
            self.state_manager.set_state('is_running', True)
            self.state_manager.set_state('start_time', time.time())
        # Example: check if wrist crosses a certain y-coordinate
        # if wrist_y < 0.2 and not self.state_manager.get_state('is_turning'):
        #     self.state_manager.set_state('is_turning', True)
        #     self.state_manager.set_state('lap_count', current_laps + 1)
        # if wrist_y > 0.8 and self.state_manager.get_state('is_turning'):
        #     self.state_manager.set_state('is_turning', False)

    def get_result(self):
        current_time = time.time() - self.state_manager.get_state('start_time')
        return {
            "testType": "Shuttle Run",
            "score": current_time,
            "result": {"laps": self.state_manager.get_state('lap_count'), "time_seconds": current_time}
        }
# ... Add similar classes for EnduranceRunAnalyzer and BroadJumpAnalyzer

# --- Main Dispatcher ---
def get_analyzer(test_type, state_manager):
    if test_type == "Sit Ups":
        return SitupsAnalyzer(state_manager)
    if test_type == "Vertical Jump":
        return VerticalJumpAnalyzer(state_manager)
    if test_type == "Shuttle Run":
        return ShuttleRunAnalyzer(state_manager)
    # Add other analyzers here

    return None

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No test type provided."}))
        sys.exit(1)

    test_type = sys.argv[1]
    state_manager = StateManager()
    analyzer = get_analyzer(test_type, state_manager)

    if not analyzer:
        print(json.dumps({"error": f"Invalid test type: {test_type}"}))
        sys.exit(1)

    # Main loop to read from stdin
    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break
            
            frame_data = json.loads(line)
            frame = base64_to_image(frame_data['frame'])
            
            if frame is not None:
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = pose_model.process(frame_rgb)
                
                if results.pose_landmarks:
                    analyzer.process_frame(frame, results.pose_landmarks.landmark)
                    result = analyzer.get_result()
                    sys.stdout.write(json.dumps(result) + '\n')
                    sys.stdout.flush()

        except json.JSONDecodeError:
            continue
        except Exception as e:
            print(json.dumps({"error": f"An unexpected error occurred: {str(e)}"}), file=sys.stderr)
            sys.stderr.flush()

if __name__ == "__main__":
    main()