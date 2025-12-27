<script lang="ts">
  /**
   * VU Meter Component
   * Displays a value (0-100) as a segmented meter bar
   * with green/yellow/red zones like an audio VU meter
   */

  interface Props {
    /** Value from 0-100 */
    value: number;
    /** Number of segments (default: 10) */
    segments?: number;
    /** Show numeric value (default: false) */
    showValue?: boolean;
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
  }

  let {
    value,
    segments = 10,
    showValue = false,
    size = 'md'
  }: Props = $props();

  // Calculate which segments are active and their colors
  function getSegmentState(index: number, total: number, val: number): { active: boolean; color: 'green' | 'yellow' | 'red' } {
    const threshold = (index + 1) / total * 100;
    const active = val >= threshold - (100 / total);

    // Color zones: 0-60% green, 60-80% yellow, 80-100% red
    let color: 'green' | 'yellow' | 'red' = 'green';
    const position = (index + 1) / total;
    if (position > 0.8) {
      color = 'red';
    } else if (position > 0.6) {
      color = 'yellow';
    }

    return { active, color };
  }

  const sizeClasses = {
    sm: 'h-2 gap-px',
    md: 'h-3 gap-0.5',
    lg: 'h-4 gap-0.5'
  };

  const segmentWidths = {
    sm: 'w-1',
    md: 'w-1',
    lg: 'w-1.5'
  };
</script>

<div class="flex items-center gap-2">
  <div class="vu-meter {sizeClasses[size]}" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
    {#each Array(segments) as _, i}
      {@const state = getSegmentState(i, segments, value)}
      <div
        class="segment {segmentWidths[size]} rounded-sm transition-colors duration-75
          {state.active ? `active ${state.color}` : ''}"
        style="height: 100%"
      ></div>
    {/each}
  </div>
  {#if showValue}
    <span class="font-mono text-xs text-[hsl(var(--muted-foreground))] tabular-nums w-7 text-right">
      {value}
    </span>
  {/if}
</div>
