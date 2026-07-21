# 3D Avatar Setup Guide

This guide explains how to set up and use the 3D talking avatar interviewer in the AI Mock Interview System.

## Overview

The interview system uses a photorealistic 3D avatar with:
- **Phonetically accurate lip-sync** driven by Rhubarb viseme data
- **Sentiment-driven facial expressions** that react to candidate performance
- **Webcam-based eye tracking** for natural eye contact
- **Idle behaviors** (blinking, breathing, micro-expressions)
- **Automatic fallbacks** to 2D avatar if WebGL unavailable

## Prerequisites

### Avatar Model Requirements

The system expects a GLB file with these specific features:

1. **File name:** `model_with_visemes.glb`
2. **Location:** `Frontend/public/models/`
3. **Skeleton:** Ready Player Me-style humanoid rig with:
   - `LeftEye` and `RightEye` bones for gaze tracking
   - `Head`, `Neck`, `Spine` hierarchy
4. **Morph Targets on `AvatarHead` mesh:**
   - **15 Oculus visemes:** `viseme_sil`, `viseme_PP`, `viseme_FF`, `viseme_TH`, `viseme_DD`, `viseme_kk`, `viseme_CH`, `viseme_SS`, `viseme_nn`, `viseme_RR`, `viseme_aa`, `viseme_E`, `viseme_I`, `viseme_O`, `viseme_U`
   - **52 ARKit blendshapes:** `eyeBlinkLeft`, `eyeBlinkRight`, `browInnerUp`, `mouthSmileLeft`, etc.

### Software Requirements

- **Node.js** 18+ and npm
- **Python** 3.8+ (for backend)
- **Rhubarb Lip Sync** binary (already configured, see main README)

## Installation Steps

### 1. Install Frontend Dependencies

```bash
cd Frontend
npm install
```

This installs:
- `three` - 3D rendering engine
- `@react-three/fiber` - React renderer for three.js
- `@react-three/drei` - Helpful three.js components
- `@gltf-transform/cli` - GLB optimization tool (dev dependency)

### 2. Place Your Avatar Model

Copy your `model_with_visemes.glb` file to:
```
Frontend/public/models/model_with_visemes.glb
```

**Important:** The file must match the requirements above. Test it first at [gltf.report](https://gltf.report/) to verify:
- File structure is valid
- Morph targets exist on `AvatarHead`
- Eye bones are present

### 3. Optimize the Model for Web

Run the optimization script to compress the GLB:

```bash
npm run optimize-avatar
```

This creates `model_with_visemes_optimized.glb` with:
- **Draco mesh compression** (~90% size reduction)
- **Texture optimization** (WebP format, 2048px max)
- **Mesh deduplication**
- **Unused data removal**

**Expected results:**
- Input: ~20MB → Output: ~2-4MB
- If savings are less than 50%, the model may already be optimized

The Avatar3D component automatically tries the optimized version first, then falls back to the original if unavailable.

### 4. Backend Configuration

The backend already generates Rhubarb mouth cues. Verify it's working:

```bash
cd Backend
python -m pip install -r requirements.txt
uvicorn main:app --reload
```

Check that `Backend/bin/rhubarb/rhubarb.exe` exists (see main README for download instructions).

## How It Works

### Architecture

```
Interview Question (text)
    ↓
Gemini TTS API → Audio WAV file
    ↓
Rhubarb Lip Sync → Mouth cues (A-H visemes)
    ↓
Frontend receives: {audio_url, mouth_cues, sentiment}
    ↓
Avatar3D Component:
    ├─ useVisemeLipSync (Rhubarb → Oculus visemes)
    ├─ useIdleBehavior (blinking, breathing)
    ├─ useSentimentExpression (confident/neutral/hesitant/struggling)
    └─ useGazeTracking (MediaPipe landmarks → eye rotation)
```

### Lip-Sync Pipeline

1. **Backend:** Rhubarb outputs 9-shape visemes (A, B, C, D, E, F, G, H, X)
2. **Frontend:** `visemeMapping.js` converts to 15 Oculus visemes
3. **Playback:** `useVisemeLipSync` syncs morph targets to `audio.currentTime`
4. **Blending:** Smooth transitions between visemes (50ms crossfade)

### Expression System

Expressions change based on the candidate's answer sentiment:

| Sentiment    | Expression               | Trigger                          |
|--------------|--------------------------|----------------------------------|
| `confident`  | Warm smile, raised brows | Strong, complete answer          |
| `neutral`    | Attentive, subtle smile  | Adequate response                |
| `hesitant`   | Encouraging, gentle      | Incomplete or uncertain answer   |
| `struggling` | Empathetic, patient      | Weak response                    |

**All expressions are supportive** — the avatar never looks disappointed or negative.

Transitions take 500-800ms with ease-out curves for natural motion.

### Eye Tracking

1. **Face Detection:** Reuses existing MediaPipe FaceLandmarker (already running for confidence detection)
2. **Position Extraction:** Gets 3D face position from facial transformation matrix
3. **Bone Rotation:** Rotates `LeftEye`/`RightEye` bones toward candidate's face
4. **Constraints:** ±35° horizontal, ±20° vertical (realistic eye movement range)
5. **Smoothing:** Low-pass filter to avoid jitter from detection noise
6. **Privacy:** All processing is client-side; no face data leaves the browser

## Troubleshooting

### Avatar Not Appearing

**Check browser console for:**
- `Avatar model file not found` → Place GLB at correct path
- `AvatarHead mesh not found` → GLB missing required mesh name
- `No Oculus viseme morph targets found` → GLB missing viseme blendshapes

**Solutions:**
1. Verify file exists: `Frontend/public/models/model_with_visemes.glb`
2. Test GLB structure at https://gltf.report/
3. Check console for which specific morph targets are missing

### Lip-Sync Not Working

**Symptoms:** Mouth doesn't move during speech

**Checks:**
1. **Backend:** Verify Rhubarb is generating cues:
   ```bash
   # Backend should log: "Generated X mouth cues for question"
   ```
2. **Frontend:** Open browser console during interview:
   ```javascript
   // Should see: "Found 15 viseme morph targets: [...]"
   ```
3. **Audio playback:** Ensure audio is actually playing (check speaker icon in avatar)

**Common causes:**
- Rhubarb binary not installed (see main README)
- Audio element not exposing `currentTime` (fixed in latest code)
- Morph target names don't match (must be exactly `viseme_aa`, etc.)

### Eye Tracking Not Working

**Symptoms:** Eyes don't follow candidate

**Checks:**
1. Webcam permission granted (check browser prompt)
2. MediaPipe loading successfully (console should show face detection starting)
3. Eye bones exist in GLB skeleton (names must be exactly `LeftEye`, `RightEye`)

**Debug:**
```javascript
// In browser console during interview:
// Should see face landmarks being detected
```

### Performance Issues

**Symptoms:** Low FPS, stuttering, high CPU usage

**Solutions:**

1. **Optimize the model** (if not done already):
   ```bash
   npm run optimize-avatar
   ```

2. **Reduce texture quality** in optimization script:
   Edit `Frontend/scripts/optimize-avatar.js`:
   ```javascript
   --texture-size 1024  // Instead of 2048
   ```

3. **Remove unused meshes:**
   - If you don't need `glasses`, `haircut`, or `outfit`, delete them in Blender before export
   - Keep only: `AvatarBody`, `AvatarHead`, `AvatarEyelashes`, eye/teeth meshes

4. **Lower Canvas DPI:**
   Edit `Frontend/src/Component/Avatar3D.jsx`:
   ```javascript
   dpr={[1, 1.5]}  // Instead of [1, 2]
   ```

5. **Disable shadows** (already disabled by default)

### WebGL Not Supported

**Automatic Fallback:** The system automatically falls back to the 2D emoji avatar if:
- WebGL is unavailable
- GLB file fails to load
- Three.js throws an error

**Check:** Look for the 🤖 emoji avatar in bottom-left corner of video feed.

## Advanced Configuration

### Customizing Expressions

Edit `Frontend/src/Hooks/useSentimentExpression.js`:

```javascript
const SENTIMENT_EXPRESSION_PRESETS = {
  confident: {
    [ARKIT_EXPRESSION_NAMES.mouthSmileLeft]: 0.35,  // 0-1 range
    [ARKIT_EXPRESSION_NAMES.mouthSmileRight]: 0.35,
    // Add more blendshapes...
  },
  // ...
};
```

### Adjusting Idle Behavior

Edit `Frontend/src/Hooks/useIdleBehavior.js`:

```javascript
// Blink frequency (milliseconds)
function randomBlinkDelay() {
  return 3000 + Math.random() * 3000;  // 3-6 seconds
}

// Blink duration (milliseconds)
function randomBlinkDuration() {
  return 100 + Math.random() * 80;  // 100-180ms
}
```

### Tuning Eye Tracking

Edit `Frontend/src/Hooks/useGazeTracking.js`:

```javascript
const smoothingFactor = 0.15;  // Lower = smoother, higher = more responsive

// Rotation limits
const maxHorizontal = THREE.MathUtils.degToRad(35);  // ±35°
const maxVertical = THREE.MathUtils.degToRad(20);    // ±20°
```

### Camera Positioning

Edit `Frontend/src/Component/Avatar3D.jsx` in `SceneSetup()`:

```javascript
camera.position.set(0, 1.5, 0.8);  // X, Y, Z
camera.lookAt(0, 1.5, 0);          // Look-at point
camera.fov = 35;                    // Field of view
```

## Testing Checklist

Before deploying, verify:

- [ ] Avatar loads within 3 seconds on a typical connection
- [ ] Lip-sync is synchronized with audio (no lag)
- [ ] Eyes track candidate smoothly without jitter
- [ ] Expressions change appropriately after each answer
- [ ] Idle blinking occurs every 3-6 seconds
- [ ] Fallback to 2D avatar works when GLB is missing
- [ ] No console errors during normal operation
- [ ] Performance is 60fps on target hardware

## File Size Targets

| Asset                        | Size Target | Actual (Optimized) |
|------------------------------|-------------|--------------------|
| `model_with_visemes.glb`     | ~20MB       | (unoptimized)      |
| `model_with_visemes_optimized.glb` | 2-4MB | ✓ Compressed       |
| Total frontend bundle        | <500KB      | Check with `npm run build` |

## Browser Compatibility

| Feature           | Chrome | Firefox | Safari | Edge |
|-------------------|--------|---------|--------|------|
| WebGL 2.0         | ✓      | ✓       | ✓      | ✓    |
| Web Audio API     | ✓      | ✓       | ✓      | ✓    |
| MediaPipe WASM    | ✓      | ✓       | ✓      | ✓    |
| Draco decoder     | ✓      | ✓       | ✓      | ✓    |

**Minimum versions:**
- Chrome 91+
- Firefox 90+
- Safari 15+
- Edge 91+

## Security & Privacy

### Data Handling

✅ **Safe:**
- Face landmarks processed entirely in browser (JavaScript/WASM)
- Eye tracking never sends video frames or coordinates to server
- Avatar animations are purely client-side rendering

✅ **Backend receives:**
- Answer transcripts (for evaluation)
- Numerical confidence score (0-100)
- NO face images, NO video, NO biometric data

### Content Security Policy

If using CSP headers, allow:
```
script-src 'self' 'wasm-unsafe-eval';
connect-src 'self' https://cdn.jsdelivr.net;
```

## Credits & Licenses

- **Three.js:** MIT License
- **React Three Fiber:** MIT License
- **Rhubarb Lip Sync:** MIT License
- **MediaPipe:** Apache 2.0 License
- **glTF-Transform:** MIT License

Avatar model and textures must comply with your own licensing terms.

## Support

For issues specific to:
- **Lip-sync:** Check Rhubarb logs in Backend console
- **Eye tracking:** Check MediaPipe initialization in browser console
- **3D rendering:** Check Three.js errors in browser console
- **Performance:** Run Chrome DevTools Performance profiler

Open an issue on GitHub with:
- Browser version and GPU info (`chrome://gpu`)
- Console errors (screenshots)
- Avatar file size and structure (`gltf.report` link)
