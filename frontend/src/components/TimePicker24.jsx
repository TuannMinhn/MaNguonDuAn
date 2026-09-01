import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Clock } from 'lucide-react';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

// Số lượng chu kỳ lặp để tạo hiệu ứng endless scroll mượt mà
const REPEAT_COUNT = 20;
const ITEM_HEIGHT = 32;

export default function TimePicker24({
  value,
  onChange,
  disabled = false,
  placeholder = 'HH:mm',
  minTime = null // 'HH:mm' ví dụ: thời gian tối thiểu được phép chọn
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const hourListRef = useRef(null);
  const minuteListRef = useRef(null);

  // Helper tính giờ mặc định: thời gian thực tế hiện tại
  const getDefaultTime = () => {
    const now = new Date();
    // Thêm 29 phút mặc định để người mượn có thể đặt ngay mốc hợp lệ
    now.setMinutes(now.getMinutes() + 29);
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  const initialVal = value || getDefaultTime();

  const [hour, setHour] = useState(() => {
    if (!initialVal || !initialVal.includes(':')) return '08';
    return initialVal.split(':')[0].padStart(2, '0');
  });
  const [minute, setMinute] = useState(() => {
    if (!initialVal || !initialVal.includes(':')) return '30';
    return initialVal.split(':')[1].padStart(2, '0');
  });

  useEffect(() => {
    if (value && value.includes(':')) {
      const [h, m] = value.split(':');
      setHour(h.padStart(2, '0'));
      setMinute(m.padStart(2, '0'));
    }
  }, [value]);

  // Nếu người dùng mở modal quá lâu và minTime tăng lên vượt qua mốc đang chọn -> Tự động nhảy sang mốc hợp lệ
  useEffect(() => {
    if (minTime && minTime.includes(':')) {
      const [minH, minM] = minTime.split(':').map(Number);
      const currH = Number(hour);
      const currM = Number(minute);
      if (currH < minH || (currH === minH && currM < minM)) {
        const newH = String(minH).padStart(2, '0');
        const newM = String(minM).padStart(2, '0');
        setHour(newH);
        setMinute(newM);
        onChange?.(`${newH}:${newM}`);
      }
    }
  }, [minTime, hour, minute, onChange]);

  // Cuộn danh sách chính xác đến item được chọn khi mở popup
  useEffect(() => {
    if (isOpen) {
      // Dùng requestAnimationFrame để đảm bảo DOM đã render hoàn tất
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (hourListRef.current) {
            const selectedHourEl = hourListRef.current.querySelector('[data-selected="true"]');
            if (selectedHourEl) {
              selectedHourEl.scrollIntoView({ block: 'center', behavior: 'instant' });
            }
          }
          if (minuteListRef.current) {
            const selectedMinuteEl = minuteListRef.current.querySelector('[data-selected="true"]');
            if (selectedMinuteEl) {
              selectedMinuteEl.scrollIntoView({ block: 'center', behavior: 'instant' });
            }
          }
        }, 15);
      });
    }
  }, [isOpen]);

  // Endless loop scroll handler cho Giờ
  const handleHourScroll = useCallback(() => {
    const el = hourListRef.current;
    if (!el) return;
    const totalItems = HOURS.length;
    const singleCycleHeight = totalItems * ITEM_HEIGHT;
    const minThreshold = singleCycleHeight * 2;
    const maxThreshold = singleCycleHeight * (REPEAT_COUNT - 3);

    if (el.scrollTop < minThreshold) {
      el.scrollTop += singleCycleHeight * 5;
    } else if (el.scrollTop > maxThreshold) {
      el.scrollTop -= singleCycleHeight * 5;
    }
  }, []);

  // Endless loop scroll handler cho Phút
  const handleMinuteScroll = useCallback(() => {
    const el = minuteListRef.current;
    if (!el) return;
    const totalItems = MINUTES.length;
    const singleCycleHeight = totalItems * ITEM_HEIGHT;
    const minThreshold = singleCycleHeight * 2;
    const maxThreshold = singleCycleHeight * (REPEAT_COUNT - 3);

    if (el.scrollTop < minThreshold) {
      el.scrollTop += singleCycleHeight * 5;
    } else if (el.scrollTop > maxThreshold) {
      el.scrollTop -= singleCycleHeight * 5;
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectHour = (h) => {
    setHour(h);
    const newTime = `${h}:${minute}`;
    onChange?.(newTime);
  };

  const handleSelectMinute = (m) => {
    setMinute(m);
    const newTime = `${hour}:${m}`;
    onChange?.(newTime);
    setIsOpen(false);
  };

  const displayTime = value ? `${hour}:${minute}` : '';

  const middleCycle = Math.floor(REPEAT_COUNT / 2);

  const [minH, minM] = minTime && minTime.includes(':') 
    ? minTime.split(':').map(Number) 
    : [-1, -1];

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          height: '42px',
          paddingLeft: '2.3rem',
          paddingRight: '0.75rem',
          backgroundColor: 'var(--bg-secondary)',
          color: displayTime ? 'var(--text-primary)' : 'var(--text-muted)',
          border: isOpen ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: '0.88rem',
          userSelect: 'none',
          boxShadow: isOpen ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : 'none',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
        }}
      >
        <Clock
          size={15}
          style={{
            position: 'absolute',
            left: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            pointerEvents: 'none'
          }}
        />
        <span style={{ fontWeight: '600', letterSpacing: '0.5px' }}>
          {displayTime || placeholder}
        </span>
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 99999,
            backgroundColor: '#182234', // Nền đặc 100% không translucent
            border: '1px solid rgba(59, 130, 246, 0.4)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.9)',
            padding: '6px 4px',
            display: 'flex',
            gap: '4px',
            width: '136px',
            userSelect: 'none'
          }}
        >
          {/* Cột chọn Giờ (Endless roll 00 -> 23) */}
          <div
            ref={hourListRef}
            onScroll={handleHourScroll}
            onWheel={(e) => {
              e.stopPropagation();
              if (hourListRef.current) {
                hourListRef.current.scrollBy({
                  top: e.deltaY > 0 ? ITEM_HEIGHT : -ITEM_HEIGHT,
                  behavior: 'smooth'
                });
              }
            }}
            style={{
              flex: 1,
              maxHeight: '160px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1px',
              padding: '2px',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              scrollBehavior: 'smooth',
              scrollSnapType: 'y proximity',
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain'
            }}
          >
            {Array.from({ length: REPEAT_COUNT }).flatMap((_, cycleIndex) =>
              HOURS.map((h) => {
                const isSelected = h === hour;
                const isMainSelected = isSelected && cycleIndex === middleCycle;
                const isCycleEnd = h === '23';
                const isHourDisabled = minH >= 0 && Number(h) < minH;

                return (
                  <React.Fragment key={`h-${cycleIndex}-${h}`}>
                    <button
                      type="button"
                      disabled={isHourDisabled}
                      data-selected={isMainSelected ? 'true' : undefined}
                      onClick={() => !isHourDisabled && handleSelectHour(h)}
                      style={{
                        height: `${ITEM_HEIGHT}px`,
                        minHeight: `${ITEM_HEIGHT}px`,
                        padding: 0,
                        border: isSelected ? '1px solid #60a5fa' : '1px solid transparent',
                        borderRadius: '4px',
                        backgroundColor: isSelected ? '#2563eb' : 'transparent',
                        color: isSelected ? '#ffffff' : (isHourDisabled ? 'var(--text-muted)' : 'var(--text-primary)'),
                        fontWeight: isSelected ? '700' : '400',
                        fontSize: '0.85rem',
                        cursor: isHourDisabled ? 'not-allowed' : 'pointer',
                        opacity: isHourDisabled ? 0.3 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isSelected ? '0 0 10px rgba(37, 99, 235, 0.6)' : 'none',
                        transition: 'background-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
                        scrollSnapAlign: 'center'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected && !isHourDisabled) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected && !isHourDisabled) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {h}
                    </button>
                    {isCycleEnd && (
                      <div
                        style={{
                          height: `${ITEM_HEIGHT}px`,
                          minHeight: `${ITEM_HEIGHT}px`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          pointerEvents: 'none',
                          scrollSnapAlign: 'center'
                        }}
                      />
                    )}
                  </React.Fragment>
                );
              })
            )}
          </div>

          {/* Cột phân cách */}
          <div style={{ width: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)', margin: '2px 0' }} />

          {/* Cột chọn Phút (Endless roll 00 -> 59) */}
          <div
            ref={minuteListRef}
            onScroll={handleMinuteScroll}
            onWheel={(e) => {
              e.stopPropagation();
              if (minuteListRef.current) {
                minuteListRef.current.scrollBy({
                  top: e.deltaY > 0 ? ITEM_HEIGHT : -ITEM_HEIGHT,
                  behavior: 'smooth'
                });
              }
            }}
            style={{
              flex: 1,
              maxHeight: '160px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1px',
              padding: '2px',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              scrollBehavior: 'smooth',
              scrollSnapType: 'y proximity',
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain'
            }}
          >
            {Array.from({ length: REPEAT_COUNT }).flatMap((_, cycleIndex) =>
              MINUTES.map((m) => {
                const isSelected = m === minute;
                const isMainSelected = isSelected && cycleIndex === middleCycle;
                const isCycleEnd = m === '59';
                const isMinuteDisabled = minH >= 0 && (
                  Number(hour) < minH || 
                  (Number(hour) === minH && Number(m) < minM)
                );

                return (
                  <React.Fragment key={`m-${cycleIndex}-${m}`}>
                    <button
                      type="button"
                      disabled={isMinuteDisabled}
                      data-selected={isMainSelected ? 'true' : undefined}
                      onClick={() => !isMinuteDisabled && handleSelectMinute(m)}
                      style={{
                        height: `${ITEM_HEIGHT}px`,
                        minHeight: `${ITEM_HEIGHT}px`,
                        padding: 0,
                        border: isSelected ? '1px solid #60a5fa' : '1px solid transparent',
                        borderRadius: '4px',
                        backgroundColor: isSelected ? '#2563eb' : 'transparent',
                        color: isSelected ? '#ffffff' : (isMinuteDisabled ? 'var(--text-muted)' : 'var(--text-primary)'),
                        fontWeight: isSelected ? '700' : '400',
                        fontSize: '0.85rem',
                        cursor: isMinuteDisabled ? 'not-allowed' : 'pointer',
                        opacity: isMinuteDisabled ? 0.3 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isSelected ? '0 0 10px rgba(37, 99, 235, 0.6)' : 'none',
                        transition: 'background-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
                        scrollSnapAlign: 'center'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected && !isMinuteDisabled) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected && !isMinuteDisabled) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {m}
                    </button>
                    {isCycleEnd && (
                      <div
                        style={{
                          height: `${ITEM_HEIGHT}px`,
                          minHeight: `${ITEM_HEIGHT}px`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          pointerEvents: 'none',
                          scrollSnapAlign: 'center'
                        }}
                      />
                    )}
                  </React.Fragment>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
