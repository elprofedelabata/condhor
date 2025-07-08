document.addEventListener('DOMContentLoaded', () => {
  // 1) Maximizar ventana
  const win = nw.Window.get();
  win.maximize();

  // 2) Rutas y fs/path
  const fs      = require('fs');
  const path    = require('path');
  const appRoot = process.cwd();
  const params  = new URLSearchParams(window.location.search);
  const curso   = params.get('curso') || 'desconocido';

  const PROFESORES_PATH = `../cursos/${curso}/profesores.json`;
  const DEPTS_PATH      = `../cursos/${curso}/departamentos.json`;
  const PROFESORES_FILE = path.join(appRoot, 'cursos', curso, 'profesores.json');

  // 3) DOM refs
  const totalSpan     = document.getElementById('total');
  const mostradosSpan = document.getElementById('mostrados');
  const openBtn       = document.getElementById('btnAgregar');
  const overlay       = document.getElementById('add-overlay');
  const modal         = document.getElementById('add-modal');
  const closeBtn      = document.getElementById('closeAddModal');
  const cancelBtn     = document.getElementById('cancelAdd');
  const form          = document.getElementById('addProfForm');
  const selectDept    = document.getElementById('addprofDept');
  const selectA       = document.getElementById('addsustitutoA');
  const selectB       = document.getElementById('addsustituyendoA');
  const grpA          = document.getElementById('addgroupSustitutoA');
  const grpB          = document.getElementById('addgroupSustituyendoA');
  const radios        = document.querySelectorAll('input[name="estado"]');

  // 4) Datos en memoria
  let allProfs = [];
  const deptMap = {};


  // 6) Abrir / cerrar modal
  function showModal() {
    // 1) Limpio cualquier valor previo
    form.reset();
  
    // siguiente ID
    const maxId = allProfs.reduce((m,p)=>p.id>m?p.id:m,0);
    document.getElementById('addprofId').value = String(maxId+1).padStart(4,'0');
    // reset estado
    document.querySelector('input[name="estado"][value="alta"]').checked = true;
    grpA.style.display = grpB.style.display = 'none';
    // rellena selects:
    selectA.innerHTML = `<option value="">-- elige uno --</option>` +
      allProfs.filter(p=>p.altabaja==='alta')
              .map(p=>{
                const i=String(p.id).padStart(4,'0');
                return `<option value="${p.id}">${i} - ${p.nombre} ${p.apellido1}</option>`;
              }).join('');
    selectB.innerHTML = `<option value="">-- elige uno --</option>` +
      allProfs.filter(p=>p.altabaja==='baja')
              .map(p=>{
                const i=String(p.id).padStart(4,'0');
                return `<option value="${p.id}">${i} - ${p.nombre} ${p.apellido1}</option>`;
              }).join('');

    overlay.style.display = 'block';
    modal.style.display   = 'flex';
  }
  function closeModal() {
    overlay.style.display = modal.style.display = 'none';
  }

  openBtn.addEventListener('click', e => {
    e.preventDefault();  // evita que el <a href="#"> navegue
    showModal();
  });
  closeBtn.addEventListener('click',    closeModal);
  cancelBtn.addEventListener('click',   closeModal);
  overlay.addEventListener('click',     closeModal);

  radios.forEach(r=> r.addEventListener('change', ()=>{
    if (r.value==='baja' && r.checked) {
      grpA.style.display='flex';
      grpB.style.display='none';
      selectB.required   = false;
    }
    else if (r.value==='sustituto' && r.checked) {
      grpA.style.display='none';
      grpB.style.display='flex';
      selectB.required = true;
    }
    else {
      grpA.style.display=grpB.style.display='none';
      selectB.required=false;
    }
  }));

  // 7) Submit del form
  form.addEventListener('submit', e=>{
    e.preventDefault();

    const btn = e.submitter.id; // 'submitAdd' o 'submitAddContinue'
    const id = Number(document.getElementById('addprofId').value);
    const nombre    = document.getElementById('addprofNombre').value.trim();
    const ap1       = document.getElementById('addprofAp1').value.trim();
    const ap2       = document.getElementById('addprofAp2').value.trim();
    const correo    = document.getElementById('addprofEmail').value.trim();
    const deptId    = Number(selectDept.value);
    const estado = document.querySelector('input[name="estado"]:checked').value;
    let sostId = 0;

    // lógica de bajas/sustituciones
    if (estado==='baja') {
      sostId = Number(selectA.value)||0;
      const sust = allProfs.find(p=>p.id===sostId);
      if (sust) { sust.altabaja='sustituto'; sust.id_sustituto=0; }
    }
    else if (estado==='sustituto') {
      const repId = Number(selectB.value)||0;
      const rep   = allProfs.find(p=>p.id===repId);
      if (rep) rep.id_sustituto = id;
    }

    const nuevo = {
      id, nombre, apellido1:ap1, apellido2:ap2,
      correo_electronico: correo,
      id_departamento: deptId,
      altabaja: estado,
      id_sustituto: sostId
    };

    allProfs.push(nuevo);

    if (btn==='submitAdd') closeModal();
    else {
      form.reset();
      document.querySelector('input[value="alta"]').checked = true;
      grpA.style.display = grpB.style.display = 'none';
      document.getElementById('addprofId').value = String(id+1).padStart(4,'0');
    }
  });


  // 9) Carga barras
  Promise.all([
    fetch('barrasuperior.html').then(r=>r.text()),
    fetch('barralateral.html').then(r=>r.text())
  ]).then(([s,l])=>{
    document.getElementById('barra-superior').innerHTML = s;
    document.getElementById('barra-lateral').innerHTML  = l;
  }).catch(console.error);

  // refs
  const importOverlay = document.getElementById('import-overlay');
  const importModal   = document.getElementById('import-modal');
  const btnImportar   = document.getElementById('btnImportar');
  const closeImport   = document.getElementById('closeImportModal');
  const cancelImport  = document.getElementById('cancelImport');
  const importForm    = document.getElementById('importForm');

  function showImportModal(e) {
    e.preventDefault(); // si es <a>
    importOverlay.style.display = 'block';
    importModal.style.display   = 'flex';
  }
  function closeImportModal() {
    importOverlay.style.display = importModal.style.display = 'none';
  }

  // show/hide
  btnImportar.addEventListener('click',   showImportModal);
  closeImport.addEventListener('click',    closeImportModal);
  cancelImport.addEventListener('click',   closeImportModal);
  importOverlay.addEventListener('click',  closeImportModal);

  // form submit (vacío de momento)
  importForm.addEventListener('submit', e => {
    e.preventDefault();
    // aquí iría tu lógica de importación
    alert('¡Importar! (pendiente de implementar)');
  });


  // ——— EDITAR PROFESOR —————————————————————————————
  const editOverlay   = document.getElementById('edit-overlay');
  const editModal     = document.getElementById('edit-modal');
  const closeEditBtn  = document.getElementById('closeEditModal');  // botón ×
  const cancelEditBtn = document.getElementById('cancelEdit');      // botón “Cancelar” en el form de editar

  // Funciones show/hide
  function showEditModal() {
    editOverlay.style.display = 'block';
    editModal.style.display   = 'flex';
  }
  function closeEditModal() {
    editOverlay.style.display = editModal.style.display = 'none';
  }


// Y manten tus listeners de cerrar modal:
editOverlay.addEventListener('click',  closeEditModal);
closeEditBtn .addEventListener('click',closeEditModal);
cancelEditBtn.addEventListener('click',closeEditModal);




});
