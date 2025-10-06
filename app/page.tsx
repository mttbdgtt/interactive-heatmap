"use client"

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function InteractiveHeatMap() {
  const containerRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const targetMouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // Interactive heat map shader
    const vertexShader = `
      varying vec2 vUv;
      
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float uTime;
      uniform vec2 uMouse;
      uniform vec2 uResolution;
      varying vec2 vUv;
      
      // Simple noise function
      float noise(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }
      
      // Smooth noise
      float smoothNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        
        float a = noise(i);
        float b = noise(i + vec2(1.0, 0.0));
        float c = noise(i + vec2(0.0, 1.0));
        float d = noise(i + vec2(1.0, 1.0));
        
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }
      
      // Fractal noise
      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        
        for(int i = 0; i < 4; i++) {
          value += amplitude * smoothNoise(p);
          p *= 2.0;
          amplitude *= 0.5;
        }
        return value;
      }
      
      // Heat map color gradient
      vec3 heatMap(float t) {
        // Extended black range, compressed yellow/red
        vec3 black = vec3(0.0, 0.0, 0.0);
        vec3 darkBlue = vec3(0.0, 0.0, 0.3);
        vec3 blue = vec3(0.0, 0.0, 0.8);
        vec3 cyan = vec3(0.0, 0.6, 0.8);
        vec3 green = vec3(0.0, 0.8, 0.3);
        vec3 yellow = vec3(1.0, 0.9, 0.0);
        vec3 orange = vec3(1.0, 0.5, 0.0);
        vec3 red = vec3(1.0, 0.0, 0.0);
        
        // Extended black/blue range, compressed hot colors
        if(t < 0.20) {
          return black;
        } else if(t < 0.40) {
          return mix(black, darkBlue, (t - 0.20) / 0.20);
        } else if(t < 0.58) {
          return mix(darkBlue, blue, (t - 0.40) / 0.18);
        } else if(t < 0.72) {
          return mix(blue, cyan, (t - 0.58) / 0.14);
        } else if(t < 0.86) {
          return mix(cyan, green, (t - 0.72) / 0.14);
        } else if(t < 0.92) {
          return mix(green, yellow, (t - 0.86) / 0.06);
        } else if(t < 0.96) {
          return mix(yellow, orange, (t - 0.92) / 0.04);
        } else {
          return mix(orange, red, (t - 0.96) / 0.04);
        }
      }
      
      void main() {
        vec2 uv = vUv;
        vec2 p = uv * 2.0 - 1.0;
        p.x *= uResolution.x / uResolution.y;
        
        // Zoom in
        p *= 0.10;
        
        // Convert mouse to same coordinate space
        vec2 mousePos = uMouse * 0.10;
        
        // Calculate distance from mouse
        float distToMouse = length(p - mousePos);
        
        // Create heat influence from mouse (like pressing in)
        float mouseInfluence = smoothstep(0.4, 0.0, distToMouse) * 0.95;
        
        // Create displacement effect - like pressing into plastic
        // The gradient shifts/warps around the mouse
        float pressRadius = 0.7;
        float pressStrength = smoothstep(pressRadius, 0.0, distToMouse);
        vec2 toMouse = mousePos - p;
        vec2 displacement = toMouse * pressStrength * 0.6;
        
        // Apply displacement to the gradient lookup position
        p += displacement;
        
        // Static base pattern (no time-based animation)
        float time = 0.0;
        
        // Create flowing waves
        vec2 q = vec2(
          fbm(p * 2.0 + time * 0.3),
          fbm(p * 2.0 + time * 0.25)
        );
        
        vec2 r = vec2(
          fbm(p * 1.5 + q * 1.5 + time * 0.2),
          fbm(p * 1.5 + q * 1.3 - time * 0.18)
        );
        
        // Create base heat value
        float heat = fbm(p * 1.2 + r * 2.0);
        
        // Add wave-like patterns
        float wave1 = sin(p.y * 3.0 + time + heat * 2.0) * 0.5 + 0.5;
        float wave2 = sin(p.x * 2.0 - time * 0.7 + heat * 1.5) * 0.5 + 0.5;
        
        // Combine for final heat value
        float finalHeat = heat * 0.6 + wave1 * 0.2 + wave2 * 0.2;
        
        // Add mouse influence to create local hot spot
        finalHeat += mouseInfluence;
        
        // Shift darker to get more black, but mouse will still push to red
        finalHeat = finalHeat * 0.65 - 0.12;
        
        // Apply heat map colors
        vec3 color = heatMap(finalHeat);
        
        // Paper texture
        float consistentGrain = smoothNoise(uv * 1000.0) * 0.05;
        float fineGrain = noise(uv * 2000.0) * 0.04;
        float weavePattern = (smoothNoise(uv * 1500.0) * 0.5 + 0.5) * 0.035;
        float paperTexture = consistentGrain + fineGrain + weavePattern;
        
        color += paperTexture;
        
        // Subtle vignette
        float vignette = 1.0 - length(p * 0.5) * 0.3;
        color *= vignette;
        
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    // Create geometry
    const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
      }
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Mouse tracking
    const handleMouseMove = (e) => {
      targetMouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      targetMouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Animation loop
    const clock = new THREE.Clock();
    const animate = () => {
      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse interpolation - faster response
      mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.15;
      mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.15;

      // Update uniforms
      material.uniforms.uTime.value = elapsedTime;
      material.uniforms.uMouse.value.set(mouseRef.current.x, mouseRef.current.y);

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <div ref={containerRef} className="absolute inset-0" />
      
      {/* SVG Blob Button */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <a 
          href="#" 
          className="group relative block transition-transform hover:scale-105 active:scale-95"
        >
          <svg width="200" height="200" viewBox="0 0 200 200" className="drop-shadow-2xl">
            {/* Blob shape */}
            <path
              d="M100,20 C140,20 180,60 180,100 C180,140 140,180 100,180 C60,180 20,140 20,100 C20,60 60,20 100,20 Z"
              fill="rgba(255, 255, 255, 0.95)"
              className="transition-all duration-300 group-hover:fill-white"
            />
            {/* Text */}
            <text
              x="100"
              y="105"
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="24"
              fontWeight="bold"
              fill="#000"
              className="pointer-events-none select-none font-sans"
            >
              Studio B
            </text>
          </svg>
        </a>
      </div>
    </div>
  );
}