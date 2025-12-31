export default {
  mounted(el, binding) {
    const delay = Number(binding?.value?.delay ?? 0)
    const once = binding?.value?.once ?? true

    el.classList.add("reveal")
    if (delay) el.style.transitionDelay = `${delay}ms`

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.classList.add("reveal--in")
            if (once) observer.unobserve(el)
          } else if (!once) {
            el.classList.remove("reveal--in")
          }
        })
      },
      { threshold: 0.12 }
    )

    observer.observe(el)
    el._revealObserver = observer
  },
  unmounted(el) {
    el._revealObserver?.disconnect?.()
  }
}
