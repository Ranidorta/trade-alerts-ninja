
/**
 * Utility to colorize chart bars based on their values
 * This function should be called after charts are rendered
 */
export const colorizeChartBars = () => {
  // Process after a small delay to ensure chart has rendered
  setTimeout(() => {
    // Find all bar rectangles
    const barRects = document.querySelectorAll('.recharts-bar-rectangle');
    
    barRects.forEach(rect => {
      // Try to determine if this represents a negative value
      // This is a heuristic based on the Y position of the rectangle
      const rectElement = rect.querySelector('path');
      if (rectElement) {
        const transform = rect.getAttribute('transform') || '';
        const yMatch = transform.match(/translate\([^,]+,([^)]+)\)/);
        
        if (yMatch && yMatch[1]) {
          const yPos = parseFloat(yMatch[1]);
          // In Recharts, higher Y means lower on the chart, which often indicates negative values
          // We use the middle of the chart as a reference point
          const chartHeight = rect.closest('.recharts-wrapper')?.clientHeight || 0;
          const middlePoint = chartHeight / 2;
          
          if (yPos > middlePoint) {
            rect.classList.add('negative-value');
          }
        }
      }
    });
  }, 100);
};
