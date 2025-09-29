import React, { useState, useEffect, useRef } from 'react';
import { X, TrendingUp, Thermometer, Droplets, Gauge } from 'lucide-react';

interface SensorDataPoint {
  timestamp: number;
  rpm: number; // Changed from flowRate to rpm
  pressure: number;
  temperature: number;
  waterLevel: number;
}

interface TelemetryData {
  sensors: {
    flow_sensor_pin3: number;
  };
  timestamp: number;
}

interface SensorDataPresentationProps {
  isOpen: boolean;
  onClose: () => void;
  telemetryData: TelemetryData | null;
}

const SensorDataPresentation: React.FC<SensorDataPresentationProps> = ({
  isOpen,
  onClose,
  telemetryData
}) => {
  const [sensorHistory, setSensorHistory] = useState<SensorDataPoint[]>([]);
  const [selectedSensor, setSelectedSensor] = useState<'all' | 'rpm' | 'pressure' | 'temperature' | 'water'>('all');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maxDataPoints = 50; // Keep last 50 data points

  // Add new data point when telemetry updates
  useEffect(() => {
    if (telemetryData && isOpen) {
      // Scale the raw sensor value to 0-800 RPM range
      const rawRPM = telemetryData.sensors.flow_sensor_pin3;
      
      const newDataPoint: SensorDataPoint = {
        timestamp: Date.now(),
        rpm: rawRPM, // Use the raw value
        pressure: 2.2 + Math.sin(Date.now() / 5000) * 0.5, // Mock pressure data
        temperature: 39.7 + Math.sin(Date.now() / 8000) * 2, // Mock temperature data
        waterLevel: 74.5 + Math.cos(Date.now() / 6000) * 10, // Mock water level data
      };

      setSensorHistory(prev => {
        const updated = [...prev, newDataPoint];
        return updated.slice(-maxDataPoints); // Keep only last N points
      });
    }
  }, [telemetryData, isOpen]);

  // Clear history when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSensorHistory([]);
    }
  }, [isOpen]);

  // Draw the graph
  useEffect(() => {
    if (!isOpen || !canvasRef.current || sensorHistory.length < 2) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get the container dimensions
    const rect = canvas.getBoundingClientRect();
    
    // Set canvas size with proper scaling
    canvas.width = rect.width;
    canvas.height = rect.height;
    ctx.scale(1, 1); // Reset scale

    const width = canvas.width;
    const height = canvas.height;
    const padding = {
      top: 20,
      right: 40,
      bottom: 30,
      left: 60
    };
    
    const graphWidth = width - (padding.left + padding.right);
    const graphHeight = height - (padding.top + padding.bottom);

    // Clear canvas with background
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, 0, width, height);

    // Draw grid with labels
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 1;
    ctx.textAlign = 'right';
    ctx.font = '10px Inter';
    ctx.fillStyle = '#64748b';

    // Define sensor configurations
    const sensors = {
      rpm: { 
        color: '#10b981', 
        data: sensorHistory.map(d => d.rpm), // Remove the scaling here since it's already scaled
        min: 0,
        max: 800 // Set max to 800 RPM
      },
      pressure: { 
        color: '#3b82f6', 
        data: sensorHistory.map(d => d.pressure),
        min: 0,
        max: 5
      },
      temperature: { 
        color: '#ef4444', 
        data: sensorHistory.map(d => d.temperature),
        min: 20,
        max: 60
      },
      water: { 
        color: '#06b6d4', 
        data: sensorHistory.map(d => d.waterLevel),
        min: 0,
        max: 100
      }
    };

    // Update the Y-axis labels to be dynamic based on selected sensor:
    const getYAxisLabels = () => {
      if (selectedSensor === 'all') {
        // Find the largest range among all sensors for proper scaling
        const allRanges = Object.values(sensors).map(sensor => sensor.max - sensor.min);
        const maxRange = Math.max(...allRanges);
        const maxValue = Math.max(...Object.values(sensors).map(sensor => sensor.max));
        
        // Use the maximum value across all sensors for the scale
        const step = maxValue / 5;
        return Array.from({length: 6}, (_, i) => 
          Math.round(maxValue - (i * step))
        );
      } else {
        const sensor = sensors[selectedSensor];
        const range = sensor.max - sensor.min;
        const step = range / 5;
        return Array.from({length: 6}, (_, i) => 
          Math.round(sensor.max - (i * step))
        );
      }
    };

    // Horizontal grid lines
    const yLabels = getYAxisLabels();
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (i / 5) * graphHeight;
      
      // Grid line
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      
      // Y-axis labels - now dynamic
      ctx.fillText(yLabels[i].toString(), padding.left - 8, y + 4);
    }

    // Vertical grid lines
    const timeInterval = Math.floor(sensorHistory.length / 6);
    for (let i = 0; i <= 6; i++) {
      const x = padding.left + (i / 6) * graphWidth;
      
      // Grid line
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();
      
      // X-axis labels
      if (i < 6) {
        const dataIndex = i * timeInterval;
        const timeDiff = Math.floor((Date.now() - sensorHistory[dataIndex]?.timestamp) / 1000);
        ctx.textAlign = 'center';
        ctx.fillText(`${timeDiff}s`, x, height - padding.bottom + 15);
      }
    }

    // Draw sensor lines
    const drawSensorLine = (sensorKey: keyof typeof sensors) => {
      const sensor = sensors[sensorKey];
      if (selectedSensor !== 'all' && selectedSensor !== sensorKey) return;

      ctx.strokeStyle = sensor.color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      // Get the normalization range
      let maxValue, minValue;
      if (selectedSensor === 'all') {
        // Use global max/min for all sensors when showing all
        maxValue = Math.max(...Object.values(sensors).map(s => s.max));
        minValue = 0; // Use 0 as global minimum for consistency
      } else {
        maxValue = sensor.max;
        minValue = sensor.min;
      }

      sensor.data.forEach((value, index) => {
        const x = padding.left + (index / (sensor.data.length - 1)) * graphWidth;
        const normalizedValue = (value - minValue) / (maxValue - minValue);
        const y = height - padding.bottom - normalizedValue * graphHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Draw points
      ctx.fillStyle = sensor.color;
      sensor.data.forEach((value, index) => {
        const x = padding.left + (index / (sensor.data.length - 1)) * graphWidth;
        const normalizedValue = (value - minValue) / (maxValue - minValue);
        const y = height - padding.bottom - normalizedValue * graphHeight;
        
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
      });
    };

    // Draw all selected sensors
    if (selectedSensor === 'all') {
      Object.keys(sensors).forEach(key => drawSensorLine(key as keyof typeof sensors));
    } else {
      drawSensorLine(selectedSensor);
    }

    // Draw labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Time →', width / 2, height - 10);
    
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    const yAxisLabel = selectedSensor === 'all' ? 'Sensor Values' : 
                       selectedSensor === 'rpm' ? 'RPM' :
                       selectedSensor === 'pressure' ? 'Pressure (bar)' :
                       selectedSensor === 'temperature' ? 'Temperature (°C)' :
                       'Water Level (%)';
    ctx.fillText(yAxisLabel, 0, 0);
    ctx.restore();

  }, [sensorHistory, selectedSensor, isOpen]);

  // Get latest sensor values
  const getLatestValues = () => {
    const latest = sensorHistory[sensorHistory.length - 1];
    if (!latest) return null;
    return {
      rpm: latest.rpm, // Changed from flowRate to rpm
      pressure: latest.pressure,
      temperature: latest.temperature,
      waterLevel: latest.waterLevel
    };
  };

  const latestValues = getLatestValues();

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '12px',
          width: '90vw',
          maxWidth: '1400px',
          height: '75vh',
          maxHeight: '900px',
          display: 'flex',
          flexDirection: 'column',
          color: '#fff'
        }}

        onClick={(e) => e.stopPropagation()}

      >
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #333',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div
          
          style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <TrendingUp size={24} style={{ color: '#22c55e' }} />
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
              Live Sensor Data Analytics
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Controls */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #333',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: '#94a3b8' }}>Show:</span>
            {[
              { key: 'all', label: 'All Sensors', icon: null },
              { key: 'rpm', label: 'RPM', icon: Droplets }, // Changed from flow/Flow Rate to rpm/RPM
              { key: 'pressure', label: 'Pressure', icon: Gauge },
              { key: 'temperature', label: 'Temperature', icon: Thermometer },
              { key: 'water', label: 'Water Level', icon: Droplets }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSelectedSensor(key as any)}
                style={{
                  padding: '8px 16px',
                  background: selectedSensor === key ? '#22c55e' : '#374151',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                {Icon && <Icon size={14} />}
                {label}
              </button>
            ))}
          </div>
          
          <div style={{ fontSize: '14px', color: '#94a3b8' }}>
            Data Points: {sensorHistory.length}/{maxDataPoints}
          </div>
        </div>

        {/* Main Content */}
        <div style={{ 
          flex: 1,
          display: 'flex',
          padding: '24px',
          minHeight: 0 // Important for preventing overflow
        }}>
          {/* Graph container */}
          <div style={{ 
            flex: 2,
            marginRight: '24px',
            background: '#0f0f0f',
            borderRadius: '8px',
            border: '1px solid #333',
            position: 'relative',
            minHeight: 0, // Important for preventing overflow
            display: 'flex',
            flexDirection: 'column'
          }}>
            <canvas
              ref={canvasRef}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '8px'
              }}
            />
          </div>

          {/* Right sidebar - make it scrollable if needed */}
          <div style={{ 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            overflowY: 'auto',
            padding: '0 4px'
          }}>
            {/* Current Values */}
            <div style={{ 
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <h3 style={{ 
                margin: '0 0 16px 0', 
                fontSize: '18px', 
                fontWeight: '600',
                color: '#fff'
              }}>
                Current Values
              </h3>

              {latestValues ? (
                <>
                  <div style={{
                    padding: '16px',
                    background: '#0f0f0f',
                    border: '1px solid #333',
                    borderRadius: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Droplets size={16} style={{ color: '#10b981' }} />
                      <span style={{ fontSize: '14px', color: '#94a3b8' }}>RPM</span> {/* Changed from Flow Rate to RPM */}
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>
                      {latestValues.rpm.toFixed(1)} {/* Changed from flowRate to rpm */}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>RPM</div> {/* Changed from pulses/sec to RPM */}
                  </div>

                  <div style={{
                    padding: '16px',
                    background: '#0f0f0f',
                    border: '1px solid #333',
                    borderRadius: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Gauge size={16} style={{ color: '#3b82f6' }} />
                      <span style={{ fontSize: '14px', color: '#94a3b8' }}>Pressure</span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6' }}>
                      {latestValues.pressure.toFixed(1)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>bar</div>
                  </div>

                  <div style={{
                    padding: '16px',
                    background: '#0f0f0f',
                    border: '1px solid #333',
                    borderRadius: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Thermometer size={16} style={{ color: '#ef4444' }} />
                      <span style={{ fontSize: '14px', color: '#94a3b8' }}>Temperature</span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#ef4444' }}>
                      {latestValues.temperature.toFixed(1)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>°C</div>
                  </div>

                  <div style={{
                    padding: '16px',
                    background: '#0f0f0f',
                    border: '1px solid #333',
                    borderRadius: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Droplets size={16} style={{ color: '#06b6d4' }} />
                      <span style={{ fontSize: '14px', color: '#94a3b8' }}>Water Level</span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#06b6d4' }}>
                      {latestValues.waterLevel.toFixed(1)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>%</div>
                  </div>
                </>
              ) : (
                <div style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#64748b',
                  background: '#0f0f0f',
                  border: '1px solid #333',
                  borderRadius: '8px'
                }}>
                  No sensor data available
                </div>
              )}

              {/* Stats */}
              {sensorHistory.length > 0 && (
                <div style={{
                  padding: '16px',
                  background: '#0f0f0f',
                  border: '1px solid #333',
                  borderRadius: '8px'
                }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
                    Session Stats
                  </h4>
                  <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.5' }}>
                    <div>Duration: {Math.floor((Date.now() - sensorHistory[0].timestamp) / 1000)}s</div>
                    <div>Updates: {sensorHistory.length}</div>
                    <div>Avg RPM: {(sensorHistory.reduce((sum, d) => sum + d.rpm, 0) / sensorHistory.length).toFixed(1)} RPM</div> {/* Changed from Flow to RPM and p/s to RPM */}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SensorDataPresentation;