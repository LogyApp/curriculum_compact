/* ── Stepper View ───────────────────────────────────────────────────────── */

function actualizarStepper(index) {
    const stepperItems = Array.from(document.querySelectorAll('.stepper .step'));
    stepperItems.forEach((item, i) => {
        item.classList.remove('active', 'completed');
        if (i === index) item.classList.add('active');
        else if (i < index) item.classList.add('completed');
    });
}

function actualizarBotones(index, totalSteps) {
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnSubmit = document.getElementById('btn-submit');

    if (btnPrev) btnPrev.disabled = (index === 0);

    if (index === totalSteps - 1) {
        btnNext?.classList.add('hidden');
        btnSubmit?.classList.remove('hidden');
    } else {
        btnNext?.classList.remove('hidden');
        btnSubmit?.classList.add('hidden');
    }
}
