# TODO: Fix Proctoring App Issues

## Current Issues
- [ ] CameraPreview uses its own useMediaStream hook instead of receiving mediaStream as prop
- [ ] Media stream conflicts between App.tsx and CameraPreview
- [ ] Face detection may fail due to null ref errors
- [ ] Microphone test shows "not available" when stream is present
- [ ] Camera/mic toggles don't properly enable/disable functionality

## Tasks
- [x] Update CameraPreview to accept mediaStream as prop instead of managing its own stream
- [x] Fix media stream attachment in VideoFeed component
- [x] Ensure face detection hook properly handles video ref
- [x] Test microphone functionality with proper stream
- [x] Verify camera/mic toggle buttons work correctly
- [x] Test the complete application on localhost

## Completed
- [x] App.tsx manages camera/mic state and media stream
- [x] VideoFeed component forwards ref and attaches mediaStream
- [x] MicrophoneTest component uses mediaStream prop
- [x] ExamControls passes mediaStream to MicrophoneTest
- [x] useMediaStream hook properly requests permissions and manages stream
- [x] useRealFaceDetection hook checks for null refs
- [x] useRealAudioMonitoring hook accepts stream parameter
