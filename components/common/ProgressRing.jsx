import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

export default function ProgressRing({
  radius = 60,
  strokeWidth = 10,
  progress = 0,
  color = '#2DA89E',
  bgColor = '#E5E7EB',
  children,
}) {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - clampedProgress * circumference;

  return (
    <View style={{ width: radius * 2, height: radius * 2, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={radius * 2} height={radius * 2}>
        <Circle
          stroke={bgColor}
          fill="none"
          strokeWidth={strokeWidth}
          cx={radius}
          cy={radius}
          r={normalizedRadius}
        />
        <Circle
          stroke={color}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          transform={`rotate(-90, ${radius}, ${radius})`}
        />
      </Svg>
      <View style={{ position: 'absolute' }}>{children}</View>
    </View>
  );
}
