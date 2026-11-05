'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import styles from './ThreeMannequin.module.css';

export interface MeasurementPoint3D {
  id: string;
  name: string;
  // 3D coordinates on the mannequin: [-1 to 1] range
  x: number;
  y: number;
  z: number;
  // For spans
  endX?: number;
  endY?: number;
  endZ?: number;
}

// Exact 3D anatomical coordinates for tailoring landmarks
export const FEMALE_LANDMARKS_3D: MeasurementPoint3D[] = [
  // Front Landmarks (z > 0)
  { id: 'neck', name: 'Neck', x: 0, y: 1.62, z: 0.16 },
  { id: 'shoulder', name: 'Shoulder', x: -0.62, y: 1.48, z: 0.02 },
  { id: 'crossFront', name: 'Across Front', x: 0, y: 1.34, z: 0.28 },
  { id: 'bust', name: 'Bust', x: 0, y: 1.18, z: 0.35 },
  { id: 'underBust', name: 'Under Bust', x: 0, y: 1.02, z: 0.27 },
  { id: 'waist', name: 'Waist', x: 0, y: 0.82, z: 0.24 },
  { id: 'hips', name: 'Hips', x: 0, y: 0.42, z: 0.32 },
  { id: 'crotch', name: 'Crotch', x: -0.15, y: 0.26, z: 0.08 },
  { id: 'thigh', name: 'Thigh', x: -0.28, y: 0.08, z: 0.20 },
  { id: 'knee', name: 'Knee', x: -0.28, y: -0.32, z: 0.16 },
  { id: 'calf', name: 'Calf', x: -0.28, y: -0.62, z: 0.15 },
  { id: 'ankle', name: 'Ankle', x: -0.26, y: -0.92, z: 0.10 },
  { id: 'armhole', name: 'Armhole', x: -0.58, y: 1.28, z: 0.12 },
  { id: 'bicep', name: 'Bicep', x: -0.68, y: 1.12, z: 0.06 },
  { id: 'sleeveLength', name: 'Sleeve Length', x: -0.74, y: 0.65, z: 0.04 },
  { id: 'wrist', name: 'Wrist', x: -0.78, y: 0.25, z: 0.02 },
  { id: 'frontLength', name: 'Front Length', x: 0, y: 0.22, z: 0.28 },
  { id: 'dressLength', name: 'Dress Length', x: 0, y: -0.25, z: 0.22 },
  { id: 'gownLength', name: 'Gown Length', x: 0, y: -0.85, z: 0.16 },
  { id: 'trouserLength', name: 'Trouser Length', x: -0.45, y: -0.80, z: 0.12 },
  { id: 'inseam', name: 'Inseam', x: -0.12, y: -0.40, z: 0.05 },
  { id: 'outseam', name: 'Outseam', x: -0.48, y: -0.32, z: 0.05 },
  { id: 'halfLength', name: 'Half Length', x: -0.52, y: 0.0, z: 0.12 },

  // Back Landmarks (z < 0) - Only visible when turned around!
  { id: 'crossBack', name: 'Across Back', x: 0, y: 1.34, z: -0.28 },
  { id: 'napeToWaist', name: 'Nape to Waist', x: 0, y: 0.85, z: -0.26 },

  // Spans
  { id: 'shoulderToBustPoint', name: 'Shoulder to Bust Point', x: -0.52, y: 1.48, z: 0.08, endX: -0.22, endY: 1.18, endZ: 0.35 },
  { id: 'nippleToNipple', name: 'Nipple to Nipple', x: -0.22, y: 1.18, z: 0.35, endX: 0.22, endY: 1.18, endZ: 0.35 },
  { id: 'shoulderToWaist', name: 'Shoulder to Waist', x: 0.45, y: 1.48, z: 0.08, endX: 0.35, endY: 0.82, endZ: 0.24 },
  { id: 'shoulderToHips', name: 'Shoulder to Hips', x: 0.48, y: 1.48, z: 0.08, endX: 0.45, endY: 0.42, endZ: 0.32 },
];

export const MALE_LANDMARKS_3D: MeasurementPoint3D[] = [
  // Front Landmarks
  { id: 'neck', name: 'Neck', x: 0, y: 1.62, z: 0.18 },
  { id: 'shoulder', name: 'Shoulder', x: -0.72, y: 1.50, z: 0.02 },
  { id: 'crossFront', name: 'Across Front', x: 0, y: 1.35, z: 0.30 },
  { id: 'chest', name: 'Chest', x: 0, y: 1.20, z: 0.36 },
  { id: 'stomach', name: 'Stomach', x: 0, y: 0.95, z: 0.30 },
  { id: 'waist', name: 'Waist', x: 0, y: 0.75, z: 0.26 },
  { id: 'hips', name: 'Hips', x: 0, y: 0.42, z: 0.30 },
  { id: 'crotch', name: 'Crotch', x: 0, y: 0.26, z: 0.12 },
  { id: 'thigh', name: 'Thigh', x: -0.28, y: 0.08, z: 0.22 },
  { id: 'knee', name: 'Knee', x: -0.28, y: -0.32, z: 0.18 },
  { id: 'calf', name: 'Calf', x: -0.28, y: -0.62, z: 0.17 },
  { id: 'ankle', name: 'Ankle', x: -0.26, y: -0.92, z: 0.12 },
  { id: 'armhole', name: 'Armhole', x: -0.66, y: 1.30, z: 0.12 },
  { id: 'bicep', name: 'Bicep', x: -0.78, y: 1.12, z: 0.06 },
  { id: 'sleeveLength', name: 'Sleeve Length', x: -0.84, y: 0.65, z: 0.04 },
  { id: 'wrist', name: 'Wrist', x: -0.88, y: 0.25, z: 0.02 },
  { id: 'shirtLength', name: 'Shirt Length', x: 0, y: 0.35, z: 0.30 },
  { id: 'trouserLength', name: 'Trouser Length', x: -0.46, y: -0.80, z: 0.12 },
  { id: 'inseam', name: 'Inseam', x: -0.12, y: -0.40, z: 0.06 },
  { id: 'outseam', name: 'Outseam', x: -0.48, y: -0.32, z: 0.06 },

  // Back Landmarks (z < 0)
  { id: 'crossBack', name: 'Across Back', x: 0, y: 1.35, z: -0.30 },
  { id: 'backLength', name: 'Back Length', x: 0, y: 0.75, z: -0.28 },
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

  // References to three objects to control updates and render on demand
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const mannequinGroupRef = useRef<THREE.Group | null>(null);
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

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const aspect = container.clientWidth / container.clientHeight;
    const camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 100);
    camera.position.set(0, 0.35, 4.4);
    cameraRef.current = camera;

    // Renderer (Mobile Optimized)
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    // Cap pixel ratio to 1.5 to prevent low-end GPU throttling
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting (Studio Atelier Setup)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.2);
    keyLight.position.set(3, 4, 3);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe0e7ff, 0.6);
    fillLight.position.set(-3, 2, 2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.9);
    rimLight.position.set(0, 3, -4);
    scene.add(rimLight);

    // Group holding the mannequin and base
    const mannequinGroup = new THREE.Group();
    scene.add(mannequinGroup);
    mannequinGroupRef.current = mannequinGroup;

    // ── Build Anatomically Accurate Mannequin Mesh ─────────────
    buildMannequinForm(mannequinGroup, gender);

    // Initial render
    needsRenderRef.current = true;

    // Touch & Mouse Drag Interaction (Orbiting)
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
      // Clamp pitch between -0.25 and 0.25 rad to prevent flipping
      targetRotationXRef.current = Math.max(-0.25, Math.min(0.25, targetRotationXRef.current + deltaY * 0.005));

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

    // Animation & Demand Render Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth inertia damping
      const rotYDiff = targetRotationYRef.current - currentRotationYRef.current;
      const rotXDiff = targetRotationXRef.current - currentRotationXRef.current;

      if (Math.abs(rotYDiff) > 0.0005 || Math.abs(rotXDiff) > 0.0005) {
        currentRotationYRef.current += rotYDiff * 0.12;
        currentRotationXRef.current += rotXDiff * 0.12;
        if (mannequinGroupRef.current) {
          mannequinGroupRef.current.rotation.y = currentRotationYRef.current;
          mannequinGroupRef.current.rotation.x = currentRotationXRef.current;
        }
        needsRenderRef.current = true;
      }

      // Update projected 2D HTML pin coordinates when rotation changes
      if (needsRenderRef.current && cameraRef.current && mannequinGroupRef.current && container) {
        renderer.render(scene, cameraRef.current);
        needsRenderRef.current = false;

        const width = container.clientWidth;
        const height = container.clientHeight;

        const projected = points3D.map((p) => {
          const v = new THREE.Vector3(p.x, p.y, p.z);
          v.applyMatrix4(mannequinGroupRef.current!.matrixWorld);

          // Normal direction check: is this point facing the camera?
          const cameraDir = new THREE.Vector3();
          cameraRef.current!.getWorldDirection(cameraDir);
          
          // Compute surface normal roughly by vector from central spine
          const spinePos = new THREE.Vector3(0, p.y, 0).applyMatrix4(mannequinGroupRef.current!.matrixWorld);
          const surfaceNormal = new THREE.Vector3().subVectors(v, spinePos).normalize();
          const dot = surfaceNormal.dot(cameraDir.negate());

          v.project(cameraRef.current!);
          const screenX = (v.x * 0.5 + 0.5) * width;
          const screenY = (-(v.y * 0.5) + 0.5) * height;

          let endScreenX: number | undefined;
          let endScreenY: number | undefined;
          if (p.endX !== undefined && p.endY !== undefined && p.endZ !== undefined) {
            const endV = new THREE.Vector3(p.endX, p.endY, p.endZ);
            endV.applyMatrix4(mannequinGroupRef.current!.matrixWorld);
            endV.project(cameraRef.current!);
            endScreenX = (endV.x * 0.5 + 0.5) * width;
            endScreenY = (-(endV.y * 0.5) + 0.5) * height;
          }

          return {
            point: p,
            screenX,
            screenY,
            visible: dot > -0.15, // Smooth visibility threshold
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
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
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
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [gender, points3D]);

  return (
    <div className={styles.canvasContainer}>
      <div ref={mountRef} className={styles.threeCanvas} />

      {/* SVG Canvas for Projected Span Calipers */}
      <svg className={styles.spansOverlay}>
        {projectedPoints
          .filter((p) => p.isSpan && p.visible && p.endScreenX !== undefined && p.endScreenY !== undefined)
          .map((p) => (
            <line
              key={`${p.point.id}-span`}
              x1={p.screenX}
              y1={p.screenY}
              x2={p.endScreenX}
              y2={p.endScreenY}
              className={`${styles.spanLine3D} ${measurements[p.point.id] ? styles.spanLineFilled3D : ''}`}
            />
          ))}
      </svg>

      {/* Projected Interactive 3D Pins */}
      <div className={styles.pinsOverlay}>
        {projectedPoints.map((p) => {
          const hasVal = !!measurements[p.point.id];
          const isSelected = selectedPointId === p.point.id;

          return (
            <button
              key={p.point.id}
              type="button"
              className={`${styles.pin3D} ${hasVal ? styles.pinFilled3D : ''} ${isSelected ? styles.pinSelected3D : ''} ${!p.visible ? styles.pinOccluded : ''}`}
              style={{
                left: `${p.screenX}px`,
                top: `${p.screenY}px`,
                opacity: p.visible ? 1 : 0.12,
                pointerEvents: p.visible ? 'auto' : 'none',
              }}
              onClick={() => onPointSelect({ id: p.point.id, name: p.point.name })}
              title={`${p.point.name}: ${measurements[p.point.id] || 'Not recorded'}`}
            >
              <span className={styles.pinDot} />
              <span className={styles.pinTag}>
                {hasVal ? `${measurements[p.point.id]}"` : p.point.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Quick 360 Camera Controls */}
      <div className={styles.angleToolbar}>
        {(['front', 'back', 'left', 'right'] as const).map((angle) => (
          <button
            key={angle}
            type="button"
            className={`${styles.angleBtn} ${currentViewAngle === angle ? styles.angleBtnActive : ''}`}
            onClick={() => setAnglePreset(angle)}
          >
            {angle.charAt(0).toUpperCase() + angle.slice(1)}
          </button>
        ))}
      </div>

      <p className={styles.dragHint}>Drag to rotate 360° • Tap any landmark to measure</p>
    </div>
  );
}

/**
 * Builds a realistic, anatomically sculpted tailor dress form in Three.js
 */
function buildMannequinForm(group: THREE.Group, gender: 'male' | 'female') {
  const isFemale = gender === 'female';

  // Materials: Premium Tailor Canvas Linen Finish
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xefede8, // Warm ecru tailor cloth
    roughness: 0.65,
    metalness: 0.05,
    flatShading: false,
  });

  const standMaterial = new THREE.MeshStandardMaterial({
    color: 0x27272a, // Matte black tailor stand
    roughness: 0.4,
    metalness: 0.8,
  });

  const brassMaterial = new THREE.MeshStandardMaterial({
    color: 0xd97706, // Antique brass finial and neck cap
    roughness: 0.35,
    metalness: 0.7,
  });

  const seamMaterial = new THREE.LineBasicMaterial({
    color: 0xa1a1aa,
    transparent: true,
    opacity: 0.5,
  });

  // 1. Stand Base & Pole
  const baseGeo = new THREE.CylinderGeometry(0.55, 0.6, 0.08, 32);
  const baseMesh = new THREE.Mesh(baseGeo, standMaterial);
  baseMesh.position.y = -1.25;
  group.add(baseMesh);

  const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 16);
  const poleMesh = new THREE.Mesh(poleGeo, standMaterial);
  poleMesh.position.y = -0.65;
  group.add(poleMesh);

  // 2. Head / Finial Cap
  const finialGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.14, 24);
  const finialMesh = new THREE.Mesh(finialGeo, brassMaterial);
  finialMesh.position.y = 1.82;
  group.add(finialMesh);

  const finialKnobGeo = new THREE.SphereGeometry(0.09, 16, 16);
  const finialKnobMesh = new THREE.Mesh(finialKnobGeo, brassMaterial);
  finialKnobMesh.position.y = 1.93;
  group.add(finialKnobMesh);

  // 3. Neck
  const neckRadiusTop = isFemale ? 0.16 : 0.19;
  const neckRadiusBottom = isFemale ? 0.20 : 0.24;
  const neckGeo = new THREE.CylinderGeometry(neckRadiusTop, neckRadiusBottom, 0.25, 24);
  const neckMesh = new THREE.Mesh(neckGeo, bodyMaterial);
  neckMesh.position.y = 1.62;
  group.add(neckMesh);

  // 4. Anatomical Torso (Lofted Spline Mesh via Lathe & Hull Curves)
  // Define realistic contours for chest, waist, and hips
  const torsoPoints: THREE.Vector2[] = [];
  if (isFemale) {
    // Elegant tailored female silhouette
    torsoPoints.push(new THREE.Vector2(0.20, 1.50)); // Neck base
    torsoPoints.push(new THREE.Vector2(0.52, 1.45)); // Shoulder slope
    torsoPoints.push(new THREE.Vector2(0.48, 1.30)); // Underarm
    torsoPoints.push(new THREE.Vector2(0.50, 1.18)); // Bust projection
    torsoPoints.push(new THREE.Vector2(0.40, 1.02)); // Underbust
    torsoPoints.push(new THREE.Vector2(0.34, 0.82)); // Natural waist (narrowed)
    torsoPoints.push(new THREE.Vector2(0.44, 0.60)); // High hip
    torsoPoints.push(new THREE.Vector2(0.54, 0.42)); // Full hip (curved)
    torsoPoints.push(new THREE.Vector2(0.48, 0.26)); // Low pelvis
    torsoPoints.push(new THREE.Vector2(0.15, 0.20)); // Base of torso
  } else {
    // Athletic tailored male silhouette
    torsoPoints.push(new THREE.Vector2(0.24, 1.50)); // Neck base
    torsoPoints.push(new THREE.Vector2(0.64, 1.48)); // Broad shoulder
    torsoPoints.push(new THREE.Vector2(0.58, 1.32)); // Upper chest
    torsoPoints.push(new THREE.Vector2(0.56, 1.20)); // Chest / Pecs
    torsoPoints.push(new THREE.Vector2(0.50, 0.98)); // Ribcage
    torsoPoints.push(new THREE.Vector2(0.44, 0.75)); // Tailored waist
    torsoPoints.push(new THREE.Vector2(0.48, 0.52)); // Hips
    torsoPoints.push(new THREE.Vector2(0.46, 0.30)); // Pelvis
    torsoPoints.push(new THREE.Vector2(0.18, 0.22)); // Base of torso
  }

  // Create Torso Geometry
  const torsoGeo = new THREE.LatheGeometry(torsoPoints, 32);
  // Slightly flatten in Z to mimic human depth vs width (width > depth)
  torsoGeo.scale(1.0, 1.0, isFemale ? 0.72 : 0.68);
  const torsoMesh = new THREE.Mesh(torsoGeo, bodyMaterial);
  group.add(torsoMesh);

  // Female Bust Enhancements (Natural dual chest volume)
  if (isFemale) {
    const bustGeo = new THREE.SphereGeometry(0.17, 24, 24);
    bustGeo.scale(1.0, 0.9, 0.75);

    const leftBust = new THREE.Mesh(bustGeo, bodyMaterial);
    leftBust.position.set(-0.20, 1.18, 0.22);
    group.add(leftBust);

    const rightBust = new THREE.Mesh(bustGeo, bodyMaterial);
    rightBust.position.set(0.20, 1.18, 0.22);
    group.add(rightBust);
  }

  // 5. Tailored Legs
  const legRadiusTop = isFemale ? 0.20 : 0.22;
  const legRadiusKnee = isFemale ? 0.14 : 0.16;
  const legRadiusAnkle = isFemale ? 0.10 : 0.12;

  // Left Leg
  const leftLegCurve = new THREE.CurvePath<THREE.Vector3>();
  leftLegCurve.add(new THREE.LineCurve3(
    new THREE.Vector3(-0.24, 0.22, 0),
    new THREE.Vector3(-0.24, -0.92, 0)
  ));
  const legUpperGeo = new THREE.CylinderGeometry(legRadiusTop, legRadiusKnee, 0.55, 20);
  legUpperGeo.scale(1, 1, 0.85);
  const leftLegUpper = new THREE.Mesh(legUpperGeo, bodyMaterial);
  leftLegUpper.position.set(-0.24, -0.05, 0);
  group.add(leftLegUpper);

  const legLowerGeo = new THREE.CylinderGeometry(legRadiusKnee, legRadiusAnkle, 0.60, 20);
  legLowerGeo.scale(1, 1, 0.85);
  const leftLegLower = new THREE.Mesh(legLowerGeo, bodyMaterial);
  leftLegLower.position.set(-0.24, -0.62, 0);
  group.add(leftLegLower);

  // Right Leg
  const rightLegUpper = new THREE.Mesh(legUpperGeo, bodyMaterial);
  rightLegUpper.position.set(0.24, -0.05, 0);
  group.add(rightLegUpper);

  const rightLegLower = new THREE.Mesh(legLowerGeo, bodyMaterial);
  rightLegLower.position.set(0.24, -0.62, 0);
  group.add(rightLegLower);

  // 6. Draped Arms
  const armRadiusTop = isFemale ? 0.12 : 0.14;
  const armRadiusWrist = isFemale ? 0.08 : 0.09;
  const armGeo = new THREE.CylinderGeometry(armRadiusTop, armRadiusWrist, 1.25, 20);
  armGeo.scale(1, 1, 0.8);

  const armOffsetX = isFemale ? 0.62 : 0.75;
  const leftArm = new THREE.Mesh(armGeo, bodyMaterial);
  leftArm.position.set(-armOffsetX, 0.88, 0);
  leftArm.rotation.z = isFemale ? 0.14 : 0.16;
  group.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, bodyMaterial);
  rightArm.position.set(armOffsetX, 0.88, 0);
  rightArm.rotation.z = isFemale ? -0.14 : -0.16;
  group.add(rightArm);

  // 7. Tailor Construction Seams (Center Front and Waist line)
  const cfPoints = [
    new THREE.Vector3(0, 1.50, isFemale ? 0.18 : 0.22),
    new THREE.Vector3(0, 1.18, isFemale ? 0.32 : 0.36),
    new THREE.Vector3(0, 0.82, isFemale ? 0.24 : 0.26),
    new THREE.Vector3(0, 0.26, isFemale ? 0.20 : 0.22),
  ];
  const cfGeo = new THREE.BufferGeometry().setFromPoints(cfPoints);
  const cfLine = new THREE.Line(cfGeo, seamMaterial);
  group.add(cfLine);
}

