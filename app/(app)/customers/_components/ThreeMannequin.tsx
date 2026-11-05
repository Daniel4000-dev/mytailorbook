'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import styles from './ThreeMannequin.module.css';

export interface MeasurementPoint3D {
  id: string;
  name: string;
  // 3D coordinates on the human body mesh (centered at y=0, height 1.80m)
  x: number;
  y: number;
  z: number;
  // For measurement spans connecting two anatomical points
  endX?: number;
  endY?: number;
  endZ?: number;
}

// Snapped 3D surface coordinates on the realistic human female mesh
export const FEMALE_LANDMARKS_3D: MeasurementPoint3D[] = [
  // Front Landmarks
  { id: 'neck', name: 'Neck', x: 0, y: 0.595, z: 0.071 },
  { id: 'shoulder', name: 'Shoulder', x: -0.24, y: 0.528, z: 0.044 },
  { id: 'crossFront', name: 'Across Front', x: 0, y: 0.44, z: 0.15 },
  { id: 'bust', name: 'Bust', x: 0, y: 0.347, z: 0.164 },
  { id: 'underBust', name: 'Under Bust', x: 0, y: 0.24, z: 0.16 },
  { id: 'waist', name: 'Waist', x: 0, y: 0.154, z: 0.162 },
  { id: 'hips', name: 'Hips', x: 0, y: 0.004, z: 0.129 },
  { id: 'crotch', name: 'Crotch', x: -0.005, y: -0.065, z: 0.039 },
  { id: 'thigh', name: 'Thigh', x: -0.122, y: -0.251, z: 0.144 },
  { id: 'knee', name: 'Knee', x: -0.109, y: -0.42, z: 0.08 },
  { id: 'calf', name: 'Calf', x: -0.131, y: -0.594, z: 0.047 },
  { id: 'ankle', name: 'Ankle', x: -0.164, y: -0.802, z: 0.038 },
  { id: 'armhole', name: 'Armhole', x: -0.247, y: 0.415, z: 0.061 },
  { id: 'bicep', name: 'Bicep', x: -0.334, y: 0.289, z: 0.05 },
  { id: 'sleeveLength', name: 'Sleeve Length', x: -0.434, y: 0.217, z: 0.117 },
  { id: 'wrist', name: 'Wrist', x: -0.538, y: 0.073, z: 0.232 },
  { id: 'frontLength', name: 'Front Length', x: 0, y: -0.05, z: 0.13 },
  { id: 'dressLength', name: 'Dress Length', x: 0, y: -0.40, z: 0.08 },
  { id: 'gownLength', name: 'Gown Length', x: 0, y: -0.78, z: 0.04 },
  { id: 'trouserLength', name: 'Trouser Length', x: -0.164, y: -0.802, z: 0.038 },
  { id: 'inseam', name: 'Inseam', x: -0.08, y: -0.40, z: 0.02 },
  { id: 'outseam', name: 'Outseam', x: -0.19, y: -0.35, z: 0.04 },
  { id: 'halfLength', name: 'Half Length', x: -0.18, y: 0.10, z: 0.12 },

  // Back Landmarks (z < 0) - Only visible when rotated
  { id: 'crossBack', name: 'Across Back', x: 0, y: 0.445, z: -0.051 },
  { id: 'napeToWaist', name: 'Nape to Waist', x: 0, y: 0.135, z: -0.054 },

  // Spans
  { id: 'shoulderToBustPoint', name: 'Shoulder to Bust Point', x: -0.24, y: 0.528, z: 0.044, endX: -0.09, endY: 0.347, endZ: 0.164 },
  { id: 'nippleToNipple', name: 'Nipple to Nipple', x: -0.09, y: 0.347, z: 0.164, endX: 0.09, endY: 0.347, endZ: 0.164 },
  { id: 'shoulderToWaist', name: 'Shoulder to Waist', x: 0.24, y: 0.528, z: 0.044, endX: 0.14, endY: 0.154, endZ: 0.162 },
  { id: 'shoulderToHips', name: 'Shoulder to Hips', x: 0.24, y: 0.528, z: 0.044, endX: 0.18, endY: 0.004, endZ: 0.129 },
];

// Snapped 3D surface coordinates on the realistic human male mesh
export const MALE_LANDMARKS_3D: MeasurementPoint3D[] = [
  // Front Landmarks
  { id: 'neck', name: 'Neck', x: 0, y: 0.596, z: 0.08 },
  { id: 'shoulder', name: 'Shoulder', x: -0.259, y: 0.542, z: 0.025 },
  { id: 'crossFront', name: 'Across Front', x: -0.012, y: 0.428, z: 0.139 },
  { id: 'chest', name: 'Chest', x: 0, y: 0.357, z: 0.146 },
  { id: 'stomach', name: 'Stomach', x: 0, y: 0.216, z: 0.138 },
  { id: 'waist', name: 'Waist', x: 0, y: 0.107, z: 0.14 },
  { id: 'hips', name: 'Hips', x: 0, y: 0.012, z: 0.122 },
  { id: 'crotch', name: 'Crotch', x: -0.021, y: -0.079, z: 0.032 },
  { id: 'thigh', name: 'Thigh', x: -0.141, y: -0.23, z: 0.115 },
  { id: 'knee', name: 'Knee', x: -0.139, y: -0.407, z: 0.059 },
  { id: 'calf', name: 'Calf', x: -0.134, y: -0.568, z: 0.03 },
  { id: 'ankle', name: 'Ankle', x: -0.178, y: -0.81, z: 0.033 },
  { id: 'armhole', name: 'Armhole', x: -0.262, y: 0.42, z: 0.059 },
  { id: 'bicep', name: 'Bicep', x: -0.353, y: 0.297, z: 0.051 },
  { id: 'sleeveLength', name: 'Sleeve Length', x: -0.445, y: 0.242, z: 0.114 },
  { id: 'wrist', name: 'Wrist', x: -0.57, y: 0.089, z: 0.274 },
  { id: 'shirtLength', name: 'Shirt Length', x: 0, y: -0.008, z: 0.105 },
  { id: 'trouserLength', name: 'Trouser Length', x: -0.178, y: -0.81, z: 0.033 },
  { id: 'inseam', name: 'Inseam', x: -0.104, y: -0.388, z: 0.018 },
  { id: 'outseam', name: 'Outseam', x: -0.202, y: -0.346, z: 0.034 },

  // Back Landmarks (z < 0)
  { id: 'crossBack', name: 'Across Back', x: 0, y: 0.441, z: -0.067 },
  { id: 'backLength', name: 'Back Length', x: 0, y: 0.121, z: -0.074 },
];

interface ThreeMannequinProps {
  gender: 'male' | 'female';
  measurements: Record<string, string>;
  selectedPointId?: string;
  onPointSelect: (point: { id: string; name: string }) => void;
}

export default function ThreeMannequin({
  gender,
  measurements,
  selectedPointId,
  onPointSelect,
}: ThreeMannequinProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [projectedPoints, setProjectedPoints] = useState<Array<{
    point: MeasurementPoint3D;
    screenX: number;
    screenY: number;
    visible: boolean;
    isSpan: boolean;
    endScreenX?: number;
    endScreenY?: number;
  }>>([]);

  const [currentViewAngle, setCurrentViewAngle] = useState<'front' | 'back' | 'left' | 'right'>('front');

  const points3D = useMemo(
    () => (gender === 'female' ? FEMALE_LANDMARKS_3D : MALE_LANDMARKS_3D),
    [gender]
  );

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const bodyGroupRef = useRef<THREE.Group | null>(null);
  const needsRenderRef = useRef<boolean>(true);

  // Smooth rotation target and damping
  const targetRotationYRef = useRef<number>(0);
  const currentRotationYRef = useRef<number>(0);
  const targetRotationXRef = useRef<number>(0);
  const currentRotationXRef = useRef<number>(0);

  const requestRender = useCallback(() => {
    needsRenderRef.current = true;
  }, []);

  // Quick preset angle switcher
  const setAnglePreset = (angle: 'front' | 'back' | 'left' | 'right') => {
    setCurrentViewAngle(angle);
    targetRotationXRef.current = 0;
    if (angle === 'front') targetRotationYRef.current = 0;
    else if (angle === 'back') targetRotationYRef.current = Math.PI;
    else if (angle === 'left') targetRotationYRef.current = Math.PI * 0.5;
    else if (angle === 'right') targetRotationYRef.current = -Math.PI * 0.5;
    requestRender();
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // ── 1. Three.js Scene Setup ─────────────────────────────
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const aspect = container.clientWidth / container.clientHeight;
    const camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 50);
    camera.position.set(0, 0.05, 2.7);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── 2. Studio Lighting (Warm Key, Cool Fill, Golden Rim) ──
    const ambientLight = new THREE.AmbientLight(0xfff7f0, 1.3);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff0e4, 2.0);
    keyLight.position.set(2.5, 3.2, 2.8);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe4edff, 1.1);
    fillLight.position.set(-2.5, 1.8, 1.8);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffdfc4, 2.4);
    rimLight.position.set(0, 2.2, -3.0);
    scene.add(rimLight);

    // Floor shadow disc (soft circular grounding)
    const floorGeo = new THREE.CircleGeometry(0.55, 32);
    const floorMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.15,
    });
    const floorDisc = new THREE.Mesh(floorGeo, floorMat);
    floorDisc.rotation.x = -Math.PI / 2;
    floorDisc.position.y = -0.905;
    scene.add(floorDisc);

    // Body container group
    const bodyGroup = new THREE.Group();
    scene.add(bodyGroup);
    bodyGroupRef.current = bodyGroup;

    // ── 3. Realistic Skin Material ───────────────────────────
    const skinMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(gender === 'female' ? '#b8856c' : '#a8755c'),
      roughness: 0.52,
      metalness: 0.02,
      clearcoat: 0.12,
      clearcoatRoughness: 0.35,
      sheen: 0.38,
      sheenColor: new THREE.Color('#dfb098'),
      reflectivity: 0.5,
    });

    // Load micro-pore normal map texture
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      '/models/skin-normal.png',
      (normalMap) => {
        normalMap.wrapS = THREE.RepeatWrapping;
        normalMap.wrapT = THREE.RepeatWrapping;
        normalMap.repeat.set(8, 8);
        skinMaterial.normalMap = normalMap;
        skinMaterial.normalScale.set(0.2, 0.2);
        skinMaterial.needsUpdate = true;
        requestRender();
      },
      undefined,
      () => {
        // Fallback gracefully without normal map
      }
    );

    // ── 4. Load High-End CC0 Anatomical Human Body Mesh ───────
    setIsLoading(true);
    const loader = new GLTFLoader();
    const modelUrl = gender === 'female' ? '/models/female.glb' : '/models/male.glb';

    loader.load(
      modelUrl,
      (gltf) => {
        // Clear previous meshes
        while (bodyGroup.children.length > 0) {
          bodyGroup.remove(bodyGroup.children[0]);
        }

        const model = gltf.scene;
        // Center the 1.80m body at y=0
        model.position.set(0, -0.90, 0);

        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.material = skinMaterial;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });

        bodyGroup.add(model);
        setIsLoading(false);
        needsRenderRef.current = true;
      },
      undefined,
      (err) => {
        console.error('Error loading 3D human body model:', err);
        setIsLoading(false);
      }
    );

    // ── 5. Touch & Mouse Drag (360° Smooth Orbit) ────────────
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      prevMouseX = clientX;
      prevMouseY = clientY;
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const deltaX = clientX - prevMouseX;
      const deltaY = clientY - prevMouseY;
      prevMouseX = clientX;
      prevMouseY = clientY;

      targetRotationYRef.current += deltaX * 0.008;
      // Clamp pitch between -0.20 and 0.20 rad
      targetRotationXRef.current = Math.max(-0.20, Math.min(0.20, targetRotationXRef.current + deltaY * 0.005));

      needsRenderRef.current = true;
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    domElement.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    // ── 6. Animation & Demand-Driven Render Loop ──────────────
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth rotation interpolation
      const rotYDiff = targetRotationYRef.current - currentRotationYRef.current;
      const rotXDiff = targetRotationXRef.current - currentRotationXRef.current;

      if (Math.abs(rotYDiff) > 0.0005 || Math.abs(rotXDiff) > 0.0005) {
        currentRotationYRef.current += rotYDiff * 0.14;
        currentRotationXRef.current += rotXDiff * 0.14;
        if (bodyGroupRef.current) {
          bodyGroupRef.current.rotation.y = currentRotationYRef.current;
          bodyGroupRef.current.rotation.x = currentRotationXRef.current;
        }
        needsRenderRef.current = true;
      }

      // Update projected 2D HTML pins when rotation changes
      if (needsRenderRef.current && cameraRef.current && bodyGroupRef.current && container) {
        renderer.render(scene, cameraRef.current);
        needsRenderRef.current = false;

        const width = container.clientWidth;
        const height = container.clientHeight;

        const projected = points3D.map((p) => {
          const v = new THREE.Vector3(p.x, p.y, p.z);
          v.applyMatrix4(bodyGroupRef.current!.matrixWorld);

          // Compute surface normal orientation relative to camera
          const cameraDir = new THREE.Vector3();
          cameraRef.current!.getWorldDirection(cameraDir);

          const spinePos = new THREE.Vector3(0, p.y, 0).applyMatrix4(bodyGroupRef.current!.matrixWorld);
          const surfaceNormal = new THREE.Vector3().subVectors(v, spinePos).normalize();
          const dot = surfaceNormal.dot(cameraDir.negate());

          v.project(cameraRef.current!);
          const screenX = (v.x * 0.5 + 0.5) * width;
          const screenY = (-(v.y * 0.5) + 0.5) * height;

          let endScreenX: number | undefined;
          let endScreenY: number | undefined;
          if (p.endX !== undefined && p.endY !== undefined && p.endZ !== undefined) {
            const endV = new THREE.Vector3(p.endX, p.endY, p.endZ);
            endV.applyMatrix4(bodyGroupRef.current!.matrixWorld);
            endV.project(cameraRef.current!);
            endScreenX = (endV.x * 0.5 + 0.5) * width;
            endScreenY = (-(endV.y * 0.5) + 0.5) * height;
          }

          return {
            point: p,
            screenX,
            screenY,
            visible: dot > -0.15,
            isSpan: p.endX !== undefined,
            endScreenX,
            endScreenY,
          };
        });

        setProjectedPoints(projected);
      }
    };

    animate();

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
      needsRenderRef.current = true;
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      domElement.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      domElement.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);

      renderer.dispose();
      if (domElement.parentElement) {
        domElement.parentElement.removeChild(domElement);
      }
    };
  }, [gender, points3D, requestRender]);

  return (
    <div className={styles.container}>
      {/* 360° Quick Angle Selector */}
      <div className={styles.angleToolbar} role="group" aria-label="Viewing angles">
        <button
          type="button"
          className={`${styles.angleBtn} ${currentViewAngle === 'front' ? styles.angleBtnActive : ''}`}
          onClick={() => setAnglePreset('front')}
        >
          Front
        </button>
        <button
          type="button"
          className={`${styles.angleBtn} ${currentViewAngle === 'back' ? styles.angleBtnActive : ''}`}
          onClick={() => setAnglePreset('back')}
        >
          Back
        </button>
        <button
          type="button"
          className={`${styles.angleBtn} ${currentViewAngle === 'left' ? styles.angleBtnActive : ''}`}
          onClick={() => setAnglePreset('left')}
        >
          Left
        </button>
        <button
          type="button"
          className={`${styles.angleBtn} ${currentViewAngle === 'right' ? styles.angleBtnActive : ''}`}
          onClick={() => setAnglePreset('right')}
        >
          Right
        </button>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner} />
          <span className={styles.loadingText}>Loading 3D anatomy...</span>
        </div>
      )}

      {/* 3D Canvas Mount Point */}
      <div ref={mountRef} className={styles.canvasMount} />

      {/* 2D SVG Span Lines Connecting Landmarks */}
      <svg className={styles.spanSvgOverlay} preserveAspectRatio="none">
        {projectedPoints
          .filter((p) => p.isSpan && p.visible && p.endScreenX !== undefined && p.endScreenY !== undefined)
          .map((p) => (
            <line
              key={`span-${p.point.id}`}
              x1={p.screenX}
              y1={p.screenY}
              x2={p.endScreenX}
              y2={p.endScreenY}
              className={`${styles.spanLine} ${measurements[p.point.id] ? styles.spanLineFilled : ''}`}
            />
          ))}
      </svg>

      {/* Interactive Surface Measurement Pins */}
      <div className={styles.pinsLayer}>
        {projectedPoints.map(({ point, screenX, screenY, visible, isSpan, endScreenX, endScreenY }) => {
          const hasVal = !!measurements[point.id];
          const isSelected = selectedPointId === point.id;

          // For spans, position marker halfway between the two endpoints
          const posX = isSpan && endScreenX !== undefined ? (screenX + endScreenX) / 2 : screenX;
          const posY = isSpan && endScreenY !== undefined ? (screenY + endScreenY) / 2 : screenY;

          return (
            <button
              key={point.id}
              type="button"
              className={`${styles.pin} ${hasVal ? styles.pinFilled : ''} ${
                isSelected ? styles.pinSelected : ''
              } ${!visible ? styles.pinOccluded : ''}`}
              style={{
                transform: `translate3d(${posX}px, ${posY}px, 0)`,
              }}
              onClick={() => onPointSelect({ id: point.id, name: point.name })}
              title={`${point.name}${hasVal ? `: ${measurements[point.id]}` : ''}`}
              tabIndex={visible ? 0 : -1}
              aria-label={`${point.name}${hasVal ? `: ${measurements[point.id]}` : ''}`}
            >
              <span className={styles.pinDot} />
              <span className={styles.pinPill}>
                {hasVal ? `${point.name}: ${measurements[point.id]}` : point.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Interactive Helper Hint */}
      <div className={styles.rotationHint}>
        <span>Drag to rotate 360° · Tap any anatomical landmark</span>
      </div>
    </div>
  );
}
