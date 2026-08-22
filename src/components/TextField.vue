<script setup>
/**
 * Material-style outlined text field (RTL) — like Google Play's inputs.
 * The label rests inside the field; on focus/fill it floats smoothly up onto
 * the border line, and eases back down when the field is left empty.
 */
import { computed, ref } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, required: true },
  type: { type: String, default: 'text' },
  dir: { type: String, default: 'rtl' }, // direction of the typed value
  autocomplete: { type: String, default: 'off' },
  inputmode: { type: String, default: undefined },
})
const emit = defineEmits(['update:modelValue'])

const focused = ref(false)
const floating = computed(() => focused.value || props.modelValue.length > 0)
</script>

<template>
  <label class="relative block">
    <input
      :value="modelValue"
      :type="type"
      :dir="dir"
      :autocomplete="autocomplete"
      :inputmode="inputmode"
      class="peer h-13.5 w-full rounded-2xl border bg-transparent px-4 text-[15px] text-white caret-[#e11d48] outline-none transition-colors duration-200"
      :class="[
        dir === 'ltr' ? 'text-left' : 'text-right',
        focused ? 'border-[#e11d48]' : 'border-white/15',
      ]"
      @focus="focused = true"
      @blur="focused = false"
      @input="emit('update:modelValue', $event.target.value)"
    />
    <span
      class="pointer-events-none absolute right-3.5 origin-right bg-black px-1.5 transition-all duration-200 ease-out"
      :class="
        floating
          ? ['top-0', '-translate-y-1/2', 'text-[11.5px]', focused ? 'text-[#e11d48]' : 'text-white/55']
          : ['top-1/2', '-translate-y-1/2', 'text-[14px]', 'text-white/35']
      "
    >
      {{ label }}
    </span>
  </label>
</template>
