'use client';

/**
 * Chart Component
 *
 * Simple chart wrapper using CSS for basic visualizations
 * Can be extended with recharts or chart.js for more complex charts
 */

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface ChartProps {
  data: ChartDataPoint[];
  type: 'bar' | 'horizontal-bar' | 'donut';
  title?: string;
  height?: number;
}

export function Chart({ data, type, title, height = 200 }: ChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value));
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (type === 'bar') {
    return (
      <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        {title && (
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            {title}
          </h3>
        )}
        <div className="flex items-end gap-2" style={{ height }}>
          {data.map((item, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div
                className="w-full rounded-t-md transition-all duration-300"
                style={{
                  height: `${(item.value / maxValue) * 100}%`,
                  backgroundColor: item.color || '#22C55E',
                  minHeight: item.value > 0 ? '4px' : '0',
                }}
              />
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-full">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'horizontal-bar') {
    return (
      <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        {title && (
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            {title}
          </h3>
        )}
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={index}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {item.value.toLocaleString()}
                </span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${(item.value / maxValue) * 100}%`,
                    backgroundColor: item.color || '#22C55E',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'donut') {
    // Calculate segments for donut chart using reduce to avoid mutation
    const segments = data.reduce<Array<{
      label: string;
      value: number;
      color: string;
      percent: number;
      offset: number;
    }>>((acc, item, index) => {
      const percent = (item.value / total) * 100;
      const offset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].percent : 0;
      acc.push({
        ...item,
        percent,
        offset,
        color: item.color || `hsl(${index * 60}, 70%, 50%)`,
      });
      return acc;
    }, []);

    return (
      <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        {title && (
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            {title}
          </h3>
        )}
        <div className="flex items-center gap-6">
          {/* Donut */}
          <div className="relative" style={{ width: height, height }}>
            <svg viewBox="0 0 100 100" className="transform -rotate-90">
              {segments.map((segment, index) => {
                const radius = 40;
                const circumference = 2 * Math.PI * radius;
                const strokeDasharray = `${(segment.percent / 100) * circumference} ${circumference}`;
                const strokeDashoffset = -(segment.offset / 100) * circumference;

                return (
                  <circle
                    key={index}
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke={segment.color}
                    strokeWidth="12"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-300"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {total.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-2">
            {segments.map((segment, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">
                  {segment.label}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {segment.percent.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
