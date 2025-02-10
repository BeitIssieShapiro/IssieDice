// CubeCompositor.tsx
import RNPhotoManipulator, {
    Rect,
    Size,
    PhotoBatchOperations,
    ImageSource,
  } from 'react-native-photo-manipulator';
  import { ImageSourcePropType } from 'react-native';
  
  /**
   * Generates a cube texture composite in a cross layout.
   *
   * Layout (if each face is faceSize x faceSize):
   *  - Canvas size: width = 3 * faceSize, height = 4 * faceSize.
   *  - Face positions (in pixels):
   *       Face 1 (top) at:        (faceSize, 0)
   *       Face 2 (left) at:       (0, faceSize)
   *       Face 3 (front) at:      (faceSize, faceSize)
   *       Face 4 (right) at:      (2 * faceSize, faceSize)
   *       Face 5 (bottom) at:     (faceSize, 2 * faceSize)
   *       Face 6 (back) at:       (faceSize, 3 * faceSize)
   *
   * @param faces Array of 6 images (ImageSourcePropType) in order:
   *   [face1, face2, face3, face4, face5, face6]
   * @param faceSize The width (and height) of each face in pixels.
   * @param blankBase The blank base image (must be a plain image of size 3*faceSize x 4*faceSize).
   * @returns Promise that resolves with the path to the composite image.
   */
  export async function generateCubeTexture(
    faces: ImageSource[],
    faceSize: number,
    blankBase: ImageSource
  ): Promise<string> {
    if (faces.length !== 6) {
      throw new Error("Expected exactly 6 face images.");
    }
  
    // Define the composite image size.
    const compositeWidth = 3 * faceSize;
    const compositeHeight = 4 * faceSize;
  
    // Define the overlay operations.
    const operations: PhotoBatchOperations[] = [
      { operation: 'overlay', overlay: faces[0], position: { x: faceSize, y: 0 } },
      { operation: 'overlay', overlay: faces[1], position: { x: 0, y: faceSize } },
      { operation: 'overlay', overlay: faces[2], position: { x: faceSize, y: faceSize } },
      { operation: 'overlay', overlay: faces[3], position: { x: 2 * faceSize, y: faceSize } },
      { operation: 'overlay', overlay: faces[4], position: { x: faceSize, y: 2 * faceSize } },
      { operation: 'overlay', overlay: faces[5], position: { x: faceSize, y: 3 * faceSize } },
    ];
  
    // Define the crop region (entire composite) and target size.
    const cropRegion: Rect = { x: 0, y: 0, width: compositeWidth, height: compositeHeight };
    const targetSize: Size = { width: compositeWidth, height: compositeHeight };
  
    // Run the batch operation on the blank base.
    const resultPath = await RNPhotoManipulator.batch(
      blankBase,
      operations,
      cropRegion,
      targetSize,
      100 // quality (0-100)
    );
    return resultPath;
  }
  
  /**
   * Generates a cube preview composite that simulates a 3D cube using 3 faces.
   *
   * For simplicity (without perspective transform support) we compose:
   *   - Front face: faces[2]
   *   - Top face:   faces[0]
   *   - Right face: faces[3]
   *
   * We use a base image with dimensions previewWidth x previewHeight.
   * In this example, we set:
   *   previewWidth = 2 * faceSize, previewHeight = 2 * faceSize,
   * and overlay:
   *   - Front face at: (faceSize/2, faceSize/2)
   *   - Top face at:   (faceSize/2, 0)
   *   - Right face at: (faceSize, faceSize/2)
   *
   * Adjust these values as needed for your desired look.
   *
   * @param faces Array of at least 4 images (use indices: 0 for top, 2 for front, 3 for right).
   * @param faceSize The side length of each face in pixels.
   * @param blankBase The blank base image for preview (should have dimensions 2*faceSize x 2*faceSize).
   * @returns Promise that resolves with the path to the composite preview image.
   */
  export async function generateCubePreview(
    faces: ImageSource[],
    faceSize: number,
    blankBase: ImageSource
  ): Promise<string> {
    if (faces.length < 4) {
      throw new Error("At least 4 face images are required for cube preview.");
    }
  
    const previewWidth = 2 * faceSize;
    const previewHeight = 2 * faceSize;
  
    // Define overlay operations (simple positioning without skewing)
    const operations: PhotoBatchOperations[] = [
      // Draw front face centered.
      { operation: 'overlay', overlay: faces[2], position: { x: faceSize / 2, y: faceSize / 2 } },
      // Draw top face above the front face.
      { operation: 'overlay', overlay: faces[0], position: { x: faceSize / 2, y: 0 } },
      // Draw right face to the right of the front face.
      { operation: 'overlay', overlay: faces[3], position: { x: faceSize, y: faceSize / 2 } },
    ];
  
    const cropRegion: Rect = { x: 0, y: 0, width: previewWidth, height: previewHeight };
    const targetSize: Size = { width: previewWidth, height: previewHeight };
  
    const resultPath = await RNPhotoManipulator.batch(
      blankBase,
      operations,
      cropRegion,
      targetSize,
      100
    );
    return resultPath;
  }