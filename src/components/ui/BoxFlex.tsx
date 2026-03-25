import React from 'react';

interface BoxProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const Box = React.forwardRef<HTMLDivElement, BoxProps>(({ children, ...props }, ref) => {
  return React.createElement('div', { ref, ...props }, children);
});
Box.displayName = 'Box';

interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  direction?: 'row' | 'row-reverse' | 'column' | 'column-reverse';
  gap?: number | string;
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
}

export const Flex = React.forwardRef<HTMLDivElement, FlexProps>((props, ref) => {
  const { children, direction = 'row', gap = 4, align, justify, wrap = false, className, ...rest } = props;
  const gapClass = typeof gap === 'number' ? `gap-${gap}` : gap;
  const alignClass = align ? `items-${align}` : '';
  const justifyClass = justify ? `justify-${justify}` : '';
  const wrapClass = wrap ? 'flex-wrap' : '';
  
  return React.createElement('div', { 
    ref, 
    className: `flex flex-${direction} ${gapClass} ${alignClass} ${justifyClass} ${wrapClass} ${className || ''}`,
    ...rest 
  }, children);
});
Flex.displayName = 'Flex';
