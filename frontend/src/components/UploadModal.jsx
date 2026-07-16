import { useState, useEffect, useRef } from "react";
import client from "../api/client.js";

export default function UploadModal({ onClose, onUploaded }) {
  const [file, setFile] = useState(null);
  const [userCountry, setUserCountry] = useState("");
  const [employerCountry, setEmployerCountry] = useState("");
  const [clientCountry, setClientCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [contractType, setContractType] = useState("standard");

  // Camera settings state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);

  // Drag and drop state
  const [isDragOver, setIsDragOver] = useState(false);

  // Stop camera stream upon unmount or close
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  // Live camera stream initializer
  const startCamera = async () => {
    setIsCameraOpen(true);
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      setCameraStream(stream);
      // Wait for React to render video element, then attach stream
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      setError("Unable to access camera device. Please grant permissions.");
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }
    setCameraStream(null);
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    
    // Draw the current video frame on the canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const photoFile = new File([blob], `camera-snapshot-${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          setFile(photoFile);
          stopCamera();
        }
      },
      "image/jpeg",
      0.95
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file || !userCountry || !employerCountry) {
      setError("A file or camera photo, your country, and the counterparty's country are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("userCountry", userCountry);
      form.append("employerCountry", employerCountry);
      form.append("contractType", contractType);
      if (clientCountry) form.append("clientCountry", clientCountry);

      await client.post("/contracts", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onUploaded();
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Drag and drop event handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      if (selectedFile.size > 20 * 1024 * 1024) {
        setError("File size exceeds the maximum limit of 20MB.");
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError("");
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 20 * 1024 * 1024) {
        setError("File size exceeds the maximum limit of 20MB.");
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 px-4">
      <div className="card w-full max-w-lg p-6 bg-ink border border-ink-border shadow-2xl relative">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl tracking-tight text-paper">File a contract for analysis</h2>
          <button onClick={onClose} className="text-muted hover:text-paper text-xl leading-none">×</button>
        </div>

        {isCameraOpen ? (
          <div className="space-y-4">
            <div className="relative bg-black rounded border border-ink-border aspect-video overflow-hidden flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="bg-seal hover:bg-seal-bright text-ink px-4 py-2 rounded-sm font-mono text-xs font-bold shadow-lg uppercase tracking-wider"
                >
                  [Snap Photo]
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="bg-black/80 hover:bg-black border border-ink-border text-paper px-4 py-2 rounded-sm font-mono text-xs shadow-lg uppercase tracking-wider"
                >
                  Cancel
                </button>
              </div>
            </div>
            <p className="text-center text-xs text-muted font-mono">
              Align the contract document within the frame and capture.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-md p-6 text-center transition-all ${
                isDragOver 
                  ? "border-seal-bright bg-seal/10 text-paper" 
                  : "border-ink-border hover:border-seal text-muted hover:text-paper"
              }`}
            >
              {file ? (
                <div className="space-y-2">
                  <div className="font-mono text-xs text-seal-bright uppercase tracking-wide">[Selected Document]</div>
                  <div className="text-sm font-medium text-paper truncate max-w-xs mx-auto">{file.name}</div>
                  <div className="text-xs text-muted">({(file.size / 1024).toFixed(1)} KB)</div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="text-xs text-risk-high hover:underline font-mono"
                  >
                    Remove File
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-center text-3xl">📄</div>
                  <p className="text-xs font-mono">
                    DRAG AND DROP CONTRACT HERE OR CLICK TO BROWSE
                  </p>
                  <label className="inline-block cursor-pointer bg-seal/20 border border-seal/30 hover:bg-seal hover:text-ink px-4 py-1.5 rounded-sm font-mono text-[11px] text-seal-bright transition-colors uppercase tracking-wider">
                    Browse Files
                    <input
                      type="file"
                      accept=".pdf,.txt,.png,.jpg,.jpeg,.webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  <div className="text-[10px] text-muted">Supports PDF, Text, JPEG, PNG, or WEBP</div>
                </div>
              )}
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={startCamera}
                className="w-full py-2 bg-ink border border-ink-border hover:border-seal text-seal-bright font-mono text-xs tracking-wider uppercase rounded-sm flex items-center justify-center gap-2 transition-all"
              >
                📷 Capture Document with Camera
              </button>
            </div>

            <div>
              <label className="block text-xs font-mono text-muted mb-1.5 tracking-wide">CONTRACT TYPE</label>
              <select
                className="input-field font-mono text-xs bg-ink text-paper border border-ink-border focus:border-seal py-2 px-3 w-full rounded-sm"
                style={{ backgroundColor: '#121214', color: '#e4e4e7', border: '1px solid #27272a' }}
                value={contractType}
                onChange={(e) => setContractType(e.target.value)}
              >
                <option value="standard">Standard Contract</option>
                <option value="bidding">Bidding / Tender Contract</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-muted mb-1.5 tracking-wide">YOUR JURISDICTION (COUNTRY)</label>
                <input
                  className="input-field uppercase font-mono text-xs"
                  placeholder="e.g. US"
                  maxLength={5}
                  value={userCountry}
                  onChange={(e) => setUserCountry(e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-muted mb-1.5 tracking-wide">OTHER SIDE'S COUNTRY</label>
                <input
                  className="input-field uppercase font-mono text-xs"
                  placeholder="e.g. UK"
                  maxLength={5}
                  value={employerCountry}
                  onChange={(e) => setEmployerCountry(e.target.value.toUpperCase())}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-mono text-muted mb-1.5 tracking-wide">CLIENT COUNTRY (OPTIONAL)</label>
              <input
                className="input-field uppercase font-mono text-xs"
                placeholder="e.g. IN"
                maxLength={5}
                value={clientCountry}
                onChange={(e) => setClientCountry(e.target.value.toUpperCase())}
              />
            </div>

            {error && <p className="text-risk-high text-xs font-mono leading-relaxed bg-risk-high/5 p-2 rounded-sm border border-risk-high/20">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary font-mono text-xs uppercase tracking-wider">Cancel</button>
              <button
                type="submit"
                disabled={loading || !file}
                className="btn-primary font-mono text-xs uppercase tracking-wider px-5"
              >
                {loading ? "Filing AI Pipeline…" : "File Contract"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
