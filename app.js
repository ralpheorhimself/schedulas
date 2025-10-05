document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const scheduleTable = document.getElementById('schedule-table');
    const attendeesList = document.getElementById('attendees-list');
    const mainContent = document.getElementById('main-content');
    
    // Session Elements
    const sessionModal = document.getElementById('session-modal');
    const sessionSelect = document.getElementById('session-select');
    const sessionNameInput = document.getElementById('session-name');
    const saveSessionBtn = document.getElementById('save-session-btn');
    const deleteSessionBtn = document.getElementById('delete-session-btn');
    const loadSessionBtn = document.getElementById('load-session-btn');
    const newSessionBtn = document.getElementById('new-session-btn');
    
    // Control Elements
    const addRowBtn = document.getElementById('add-row-btn');
    const addColBtn = document.getElementById('add-col-btn');
    const removeRowBtn = document.getElementById('remove-row-btn');
    const removeColBtn = document.getElementById('remove-col-btn');
    const attendeeNameInput = document.getElementById('attendee-name');
    const addAttendeeBtn = document.getElementById('add-attendee-btn');
    const viewHeatmapBtn = document.getElementById('view-heatmap-btn');

    // Import Elements
    const importFromLinkBtn = document.getElementById('import-from-link-btn');
    const importLinkModal = document.getElementById('import-link-modal');
    const closeImportLinkModalBtn = document.getElementById('close-import-link-modal-btn');
    const copyScriptBtn = document.getElementById('copy-script-btn');
    const w2mLink = document.getElementById('w2m-link');
    const csvFileInput = document.getElementById('csv-file-input');
    const importFeedback = document.getElementById('import-feedback');
    
    // Tag Elements
    const tagNameInput = document.getElementById('tag-name-input');
    const addTagBtn = document.getElementById('add-tag-btn');
    const tagsList = document.getElementById('tags-list');
    const tagsModal = document.getElementById('tags-modal');
    const modalTagsList = document.getElementById('modal-tags-list');
    const tagModalAttendeeName = document.getElementById('tag-modal-attendee-name');
    const saveTagsBtn = document.getElementById('save-tags-btn');

    // Cell Editor Elements
    const cellEditorModal = document.getElementById('cell-editor-modal');
    const closeCellEditorBtn = document.getElementById('close-cell-editor-btn');
    const saveCellBtn = document.getElementById('save-cell-btn');
    const cellTextInput = document.getElementById('cell-text-input');
    const cellImageInput = document.getElementById('cell-image-input');
    const cellColorInput = document.getElementById('cell-color-input');
    const cellFormatToolbar = document.getElementById('cell-format-toolbar');
    const cellFontSizeInput = document.getElementById('cell-font-size-input');
    const cellTextColorInput = document.getElementById('cell-text-color-input');

    // --- App State ---
    let appState = {};
    let activeSessionName = '';
    let activeFilterTagId = null;
    let currentEditingCellKey = null;
    
    const defaultState = {
        attendees: [],
        tags: [],
        gridContent: {},
        gridConfig: { 
            rows: 5, cols: 5, 
            rowHeights: {}, 
            colWidths: {} 
        },
        nextAttendeeId: 0,
        nextTagId: 0
    };
    
    // --- Session Management ---
    function loadSessionList() {
        const sessionKeys = JSON.parse(localStorage.getItem('scheduler_sessions')) || [];
        sessionSelect.innerHTML = sessionKeys.map(key => `<option value="${key}">${key}</option>`).join('');
        return sessionKeys;
    }

    function saveActiveSession() {
        if (!activeSessionName) return;
        localStorage.setItem(activeSessionName, JSON.stringify(appState));
        const sessionKeys = JSON.parse(localStorage.getItem('scheduler_sessions')) || [];
        if (!sessionKeys.includes(activeSessionName)) {
            sessionKeys.push(activeSessionName);
            localStorage.setItem('scheduler_sessions', JSON.stringify(sessionKeys));
        }
        loadSessionList();
    }

    function loadSession(sessionName) {
        try {
            const savedState = localStorage.getItem(sessionName);
            appState = savedState ? JSON.parse(savedState) : { ...JSON.parse(JSON.stringify(defaultState)) };
            // Ensure new properties exist for backwards compatibility
            if (!appState.gridConfig) appState.gridConfig = { ...defaultState.gridConfig };
            if (!appState.gridConfig.rowHeights) appState.gridConfig.rowHeights = {};
            if (!appState.gridConfig.colWidths) appState.gridConfig.colWidths = {};
            if (!appState.tags) appState.tags = [];
        } catch (error) {
            console.error("Failed to load or parse session data. Resetting to default.", error);
            appState = { ...JSON.parse(JSON.stringify(defaultState)) };
        }

        activeSessionName = sessionName;
        sessionNameInput.value = sessionName;
        renderAll();
    }
    
    function deleteActiveSession() {
        if (!activeSessionName) return;
        localStorage.removeItem(activeSessionName);
        let sessionKeys = JSON.parse(localStorage.getItem('scheduler_sessions')) || [];
        sessionKeys = sessionKeys.filter(k => k !== activeSessionName);
        localStorage.setItem('scheduler_sessions', JSON.stringify(sessionKeys));
        loadSession(sessionKeys.length > 0 ? sessionKeys[0] : 'New Session');
        loadSessionList();
    }

    // --- Core Rendering ---
    function renderAll() {
        renderGrid();
        renderAttendees();
        renderTags();
    }

    function renderGrid() {
        const { rows, cols, rowHeights, colWidths } = appState.gridConfig;
        
        let tableHTML = '<thead><tr>';
        // Add a blank corner header
        tableHTML += '<th></th>';
        for (let i = 0; i < cols; i++) {
            const width = colWidths[i] ? `style="width: ${colWidths[i]}px;"` : '';
            tableHTML += `<th data-col="${i}" contenteditable="true" class="col-resizable" ${width}>Column ${i + 1}</th>`;
        }
        tableHTML += '</tr></thead><tbody>';

        for (let i = 0; i < rows; i++) {
            const height = rowHeights[i] ? `style="height: ${rowHeights[i]}px;"` : '';
            tableHTML += `<tr data-row="${i}" ${height}>`;
            // Add row header for resizing
            tableHTML += `<th data-row="${i}" class="row-resizable" contenteditable="true">R${i+1}</th>`;

            for (let j = 0; j < cols; j++) {
                const key = `r${i}_c${j}`;
                const cellData = appState.gridContent[key] || {};
                
                let styles = `background-color: ${cellData.bgColor || 'transparent'};`;
                let textStyles = `
                    --cell-font-size: ${cellData.fontSize || '14px'};
                    --cell-text-color: ${cellData.textColor || '#333'};
                    --cell-text-align: ${cellData.textAlign || 'left'};
                `;

                let cellContentHTML = `<div class="cell-content" style="${textStyles}">`;
                if (cellData.image) {
                    cellContentHTML += `<img src="${cellData.image}" class="cell-image" alt="User content" onerror="this.style.display='none'">`;
                }
                if (cellData.text) {
                    cellContentHTML += `<div class="cell-text">${cellData.text.replace(/\n/g, '<br>')}</div>`;
                }
                if (cellData.attendees && cellData.attendees.length > 0) {
                     cellContentHTML += '<div class="cell-attendees-container">';
                     cellContentHTML += cellData.attendees.map(item => createAttendeeBlockHTML(item)).join('');
                     cellContentHTML += '</div>';
                }
                cellContentHTML += '</div>';
    
                tableHTML += `<td data-row="${i}" data-col="${j}" style="${styles}">${cellContentHTML}</td>`;
            }
            tableHTML += '</tr>';
        }
        tableHTML += '</tbody>';
        scheduleTable.innerHTML = tableHTML;
    }
    
    function createAttendeeBlockHTML(item) {
        const attendee = appState.attendees.find(a => a.id === item.id);
        if (!attendee) return '';
        
        const isFilteredOut = activeFilterTagId !== null && !(item.tags || []).includes(activeFilterTagId);
        const tagsHTML = `<div class="attendee-tags-container">
            ${(item.tags || []).map(tagId => {
                const tag = appState.tags.find(t => t.id === tagId);
                return tag ? `<span class="attendee-tag" style="background-color: ${tag.color};">${tag.name}</span>` : '';
            }).join('')}
        </div>`;

        return `
            <div class="attendee-block placed-attendee ${isFilteredOut ? 'filtered-out' : ''}" data-id="${attendee.id}" style="background-color: ${attendee.color};" draggable="true">
                <div class="attendee-name-bar">
                    <span class="flex-grow">${attendee.name}</span>
                    <button class="assign-tags-btn text-xs text-white opacity-70 hover:opacity-100 p-1 ml-auto">Tags</button>
                </div>
                ${tagsHTML}
            </div>
        `;
    }
    
    function renderAttendees() { /* ... unchanged ... */ }
    function renderTags() { /* ... unchanged ... */ }

    // --- Cell Editor ---
    function openCellEditorModal(cell) {
        const { row, col } = cell.dataset;
        currentEditingCellKey = `r${row}_c${col}`;
        const cellData = appState.gridContent[currentEditingCellKey] || {};
        cellTextInput.value = cellData.text || '';
        cellImageInput.value = cellData.image || '';
        cellColorInput.value = cellData.bgColor || '#ffffff';
        cellFontSizeInput.value = cellData.fontSize || '14px';
        cellTextColorInput.value = cellData.textColor || '#333333';
        document.querySelectorAll('.format-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.align === (cellData.textAlign || 'left'));
        });
        cellEditorModal.classList.remove('hidden');
    }

    function saveCellChanges() {
        if (!currentEditingCellKey) return;
        const key = currentEditingCellKey;
        if (!appState.gridContent[key]) {
            appState.gridContent[key] = { attendees: [] };
        }
        const activeAlignBtn = cellFormatToolbar.querySelector('.format-btn.active');
        appState.gridContent[key].text = cellTextInput.value.trim();
        appState.gridContent[key].image = cellImageInput.value.trim();
        appState.gridContent[key].bgColor = cellColorInput.value;
        appState.gridContent[key].fontSize = cellFontSizeInput.value;
        appState.gridContent[key].textColor = cellTextColorInput.value;
        appState.gridContent[key].textAlign = activeAlignBtn ? activeAlignBtn.dataset.align : 'left';
        cellEditorModal.classList.add('hidden');
        currentEditingCellKey = null;
        renderGrid();
        saveActiveSession();
    }
    
    // --- CSV Import ---
    const w2mScraperScript = `function getCSV({delimiter=";",timeFormat="24-hour"}={}){if("undefined"==typeof PeopleNames||"undefined"==typeof PeopleIDs||"undefined"==typeof AvailableAtSlot||"undefined"==typeof TimeOfSlot)return void alert("This script must be run on a When2Meet event page.");let result="Day"+delimiter+"Time"+delimiter+PeopleNames.join(delimiter)+"\\n";for(let i=0;i<AvailableAtSlot.length;i++){let slot=new Date(1e3*TimeOfSlot[i]);if(!slot)continue;let day=slot.toLocaleDateString("en-US",{weekday:"short"}),time=slot.toLocaleTimeString("en-US",{hour12:"12-hour"===timeFormat,hour:"2-digit",minute:"2-digit"});result+=day+delimiter+time+delimiter,result+=PeopleIDs.map(id=>AvailableAtSlot[i].includes(id)?1:0).join(delimiter),result+="\\n"}return result}function downloadCSV({filename:filename,delimiter:delimiter=";",timeFormat:timeFormat="24-hour"}={}){const urlParams=new URLSearchParams(window.location.search),uniqueCode=urlParams.keys().next().value||"UNKNOWNCODE",timestamp=(new Date).toISOString().slice(0,19).replace(/[:]/g,"");filename||(filename=\`when2meet_\${uniqueCode}_\${timestamp}.csv\`);const content=getCSV({delimiter:delimiter,timeFormat:timeFormat});if(!content)return;const bom="\\uFEFF",file=new Blob([bom+content],{type:"text/csv;charset=utf-8;"}),link=document.createElement("a");link.href=URL.createObjectURL(file),link.download=filename,document.body.appendChild(link),link.click(),document.body.removeChild(link),URL.revokeObjectURL(link.href)}downloadCSV();`;
    function handleCSVImport(event) { /* ... unchanged ... */ }
    function parseWhen2MeetCSV(csvText, startDateString) { /* ... unchanged ... */ }

    // --- Grid & Attendee Controls ---
    function addGridRow() { appState.gridConfig.rows++; renderGrid(); saveActiveSession(); }
    function addGridColumn() { appState.gridConfig.cols++; renderGrid(); saveActiveSession(); }
    
    function removeGridRow() {
        if (appState.gridConfig.rows > 0) {
            const newGridContent = {};
            const newRows = appState.gridConfig.rows - 1;

            for (let i = 0; i < newRows; i++) {
                for (let j = 0; j < appState.gridConfig.cols; j++) {
                    const key = `r${i}_c${j}`;
                    if (appState.gridContent[key]) {
                        newGridContent[key] = appState.gridContent[key];
                    }
                }
            }
            appState.gridContent = newGridContent;
            appState.gridConfig.rows = newRows;
            delete appState.gridConfig.rowHeights[newRows];
            
            renderGrid();
            saveActiveSession();
        }
    }

    function removeGridColumn() {
        if (appState.gridConfig.cols > 0) {
            const newGridContent = {};
            const newCols = appState.gridConfig.cols - 1;

            for (let i = 0; i < appState.gridConfig.rows; i++) {
                for (let j = 0; j < newCols; j++) {
                    const key = `r${i}_c${j}`;
                    if (appState.gridContent[key]) {
                        newGridContent[key] = appState.gridContent[key];
                    }
                }
            }
            appState.gridContent = newGridContent;
            appState.gridConfig.cols = newCols;
            delete appState.gridConfig.colWidths[newCols];

            renderGrid();
            saveActiveSession();
        }
    }

    function addAttendee() { /* ... unchanged ... */ }

    // --- Tag Management ---
    function addTag() { /* ... unchanged ... */ }
    let currentTaggingContext = null;
    function openTagsModal(attendeeBlock) { /* ... unchanged ... */ }
    function saveTags() { /* ... unchanged ... */ }
    function toggleTagFilter(tagId) { /* ... unchanged ... */ }

    // --- Drag and Drop Logic ---
    let draggedItem = null;
    function handleDragStart(e) { /* ... unchanged ... */ }
    function handleDrop(e) {
        e.preventDefault();
        const cell = e.target.closest('td');
        if (!cell || !draggedItem) return;

        const key = `r${cell.dataset.row}_c${cell.dataset.col}`;
        
        if (!appState.gridContent[key]) {
            appState.gridContent[key] = { attendees: [], text: '', image: '', bgColor: '' };
        }
        if (!appState.gridContent[key].attendees) {
            appState.gridContent[key].attendees = [];
        }

        let itemToAdd = { id: draggedItem.id, tags: [] }; 

        if (draggedItem.sourceKey) {
            const sourceCellData = appState.gridContent[draggedItem.sourceKey];
            if (sourceCellData && sourceCellData.attendees) {
                const sourceItemIndex = sourceCellData.attendees.findIndex(i => i.id === draggedItem.id);
                if (sourceItemIndex > -1) {
                    itemToAdd = sourceCellData.attendees.splice(sourceItemIndex, 1)[0];
                }
            }
        }

        if (!appState.gridContent[key].attendees.some(i => i.id === draggedItem.id)) {
            appState.gridContent[key].attendees.push(itemToAdd);
        }

        draggedItem = null;
        saveActiveSession();
        renderGrid();
    }


    // --- Resizing Logic ---
    let resizing = null;
    function startResize(e) { /* ... unchanged ... */ }
    function handleResize(e) { /* ... unchanged ... */ }
    function endResize() { /* ... unchanged ... */ }

    // --- Initial Setup & Event Listeners ---
    function init() {
        // Session Listeners
        loadSessionBtn.addEventListener('click', () => { 
            if(sessionSelect.value) loadSession(sessionSelect.value);
            sessionModal.classList.add('hidden'); 
        });
        newSessionBtn.addEventListener('click', () => {
            const newName = prompt("Enter name for the new session:", "New Session " + new Date().toLocaleDateString());
            if (newName) { 
                loadSession(newName); 
                saveActiveSession(); 
            }
            sessionModal.classList.add('hidden');
        });
        saveSessionBtn.addEventListener('click', () => {
            const newName = sessionNameInput.value.trim();
            if (newName && newName !== activeSessionName) {
                activeSessionName = newName;
            }
            saveActiveSession();
            alert(`Session '${activeSessionName}' saved!`);
        });
        deleteSessionBtn.addEventListener('click', () => {
            if (confirm(`Are you sure you want to delete session '${activeSessionName}'?`)) {
                deleteActiveSession();
            }
        });
        
        // Import Listeners
        importFromLinkBtn.addEventListener('click', () => {
            const url = prompt("Please enter the When2Meet event URL:");
            if (url) {
                try {
                    new URL(url); // Validate URL format
                    w2mLink.href = url;
                    importLinkModal.classList.remove('hidden');
                } catch(_) {
                    alert("Invalid URL format.");
                }
            }
        });
        closeImportLinkModalBtn.addEventListener('click', () => importLinkModal.classList.add('hidden'));
        copyScriptBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(w2mScraperScript).then(() => {
                copyScriptBtn.textContent = 'Copied!';
                setTimeout(() => copyScriptBtn.innerHTML = '<u>Click here to copy the import script</u>', 2000);
            });
        });
        csvFileInput.addEventListener('change', handleCSVImport);

        // Control Listeners
        addAttendeeBtn.addEventListener('click', addAttendee);
        addRowBtn.addEventListener('click', addGridRow);
        addColBtn.addEventListener('click', addGridColumn);
        removeRowBtn.addEventListener('click', removeGridRow);
        removeColBtn.addEventListener('click', removeGridColumn);
        
        // Tag Listeners
        addTagBtn.addEventListener('click', addTag);
        saveTagsBtn.addEventListener('click', saveTags);
        tagsList.addEventListener('click', e => {
            const tagEl = e.target.closest('.sidebar-tag');
            if (tagEl) toggleTagFilter(parseInt(tagEl.dataset.tagId));
        });

        // Event Delegation for dynamic elements
        attendeesList.addEventListener('click', e => {
            const target = e.target;
            const id = parseInt(target.dataset.id);
            if (target.classList.contains('remove-attendee-btn')) {
                appState.attendees = appState.attendees.filter(a => a.id !== id);
                renderAll();
                saveActiveSession();
            }
            if (target.classList.contains('set-availability-btn')) {
                openAvailabilityModal(id);
            }
        });

        mainContent.addEventListener('click', e => {
            if (e.target.classList.contains('assign-tags-btn')) {
                openTagsModal(e.target.closest('.placed-attendee'));
            } else {
                const cell = e.target.closest('td');
                if (cell && !e.target.closest('.attendee-block')) {
                    openCellEditorModal(cell);
                }
            }
        });
        
        // Cell Editor Listeners
        cellFormatToolbar.addEventListener('click', e => {
            if (e.target.classList.contains('format-btn')) {
                cellFormatToolbar.querySelectorAll('.format-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
            }
        });
        closeCellEditorBtn.addEventListener('click', () => cellEditorModal.classList.add('hidden'));
        saveCellBtn.addEventListener('click', saveCellChanges);

        // Drag, Drop, and Resize Listeners
        attendeesList.addEventListener('dragstart', handleDragStart);
        mainContent.addEventListener('dragstart', handleDragStart);
        mainContent.addEventListener('dragover', e => e.preventDefault());
        mainContent.addEventListener('drop', handleDrop);
        mainContent.addEventListener('dragend', () => renderGrid());
        mainContent.addEventListener('mousedown', startResize);

        // Load initial session
        const sessionKeys = loadSessionList();
        if (sessionKeys.length > 0) {
            sessionModal.classList.remove('hidden');
        } else {
            sessionModal.classList.add('hidden');
            loadSession('My First Session');
        }
        
        // Other Modal Listeners
        const availabilityModal = document.getElementById('availability-modal');
        const closeModalBtn = document.getElementById('close-modal-btn');
        const addDateBtn = document.getElementById('add-date-btn');
        const availabilityDatePicker = document.getElementById('availability-date-picker');
        const availabilityGridContainer = document.getElementById('availability-grid-container');

        closeModalBtn.addEventListener('click', () => {
            if (availState.currentAttendee) {
                availState.currentAttendee.availability = availState.availability;
                saveActiveSession();
            }
            availabilityModal.classList.add('hidden');
        });

        addDateBtn.addEventListener('click', () => {
            if (availabilityDatePicker.value && !availState.dates.includes(availabilityDatePicker.value)) {
                availState.dates.push(availabilityDatePicker.value);
                availState.dates.sort();
                availState.availability[availabilityDatePicker.value] = Array(24).fill(false);
                renderAvailabilityGrid();
            }
        });
         availabilityGridContainer.addEventListener('click', e => {
            if (e.target.classList.contains('availability-slot')) {
                const { date, hour } = e.target.dataset;
                availState.availability[date][hour] = !availState.availability[date][hour];
                renderAvailabilityGrid();
            }
            if (e.target.classList.contains('remove-date-btn')) {
                const date = e.target.dataset.date;
                availState.dates = availState.dates.filter(d => d !== date);
                delete availState.availability[date];
                renderAvailabilityGrid();
            }
        });

        viewHeatmapBtn.addEventListener('click', generateAndShowHeatmap);
        const heatmapModal = document.getElementById('heatmap-modal');
        const closeHeatmapBtn = document.getElementById('close-heatmap-btn');
        const heatmapGridContainer = document.getElementById('heatmap-grid-container');
        closeHeatmapBtn.addEventListener('click', () => heatmapModal.classList.add('hidden'));
        heatmapGridContainer.addEventListener('mouseover', e => {
            if (e.target.classList.contains('heatmap-cell')) showHeatmapTooltip(e.target, e);
        });
        heatmapGridContainer.addEventListener('mouseout', () => document.getElementById('heatmap-tooltip')?.remove());
    }

    // --- Helpers & Unchanged/Restored Functions ---
    const getRandomColor = (alpha = 1) => `hsla(${Math.random() * 360}, 70%, 50%, ${alpha})`;
    const formatDate = (dateStr) => new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    const formatTime = (hour) => {
        const h = parseInt(hour); if (h === 0) return '12 AM'; if (h === 12) return '12 PM';
        if (h < 12) return `${h} AM`; return `${h - 12} PM`;
    };
    
    // Full function bodies for completeness
    renderAttendees = function() { attendeesList.innerHTML = appState.attendees.map(att => `<div id="attendee-${att.id}" class="attendee-block" style="background-color: ${att.color};" draggable="true"><div class="attendee-name-bar"><span>${att.name}</span><div class="flex items-center ml-auto"><button class="set-availability-btn text-xs text-white opacity-70 hover:opacity-100 p-1" data-id="${att.id}">Avail</button><button class="remove-attendee-btn text-xs text-white opacity-70 hover:opacity-100 p-1" data-id="${att.id}">X</button></div></div></div>`).join(''); };
    renderTags = function() { tagsList.innerHTML = appState.tags.map(tag => `<div class="sidebar-tag ${activeFilterTagId === tag.id ? 'filter-active' : ''}" style="background-color: ${tag.color}; color: white;" data-tag-id="${tag.id}">${tag.name}</div>`).join(''); };
    addAttendee = function() { const name = attendeeNameInput.value.trim(); if (name) { const newAttendee = { id: appState.nextAttendeeId++, name, color: getRandomColor(), availability: {} }; appState.attendees.push(newAttendee); attendeeNameInput.value = ''; renderAttendees(); saveActiveSession(); } };
    addTag = function() { const name = tagNameInput.value.trim(); if (name) { const newTag = { id: appState.nextTagId++, name, color: getRandomColor(0.8) }; appState.tags.push(newTag); tagNameInput.value = ''; renderTags(); saveActiveSession(); } };
    handleDragStart = function(e) { const block = e.target.closest('.attendee-block'); if (!block) return; const id = parseInt(block.id?.split('-')[1] || block.dataset.id); draggedItem = { id }; if (block.classList.contains('placed-attendee')) { const cell = block.closest('td'); draggedItem.sourceKey = `r${cell.dataset.row}_c${cell.dataset.col}`; } e.dataTransfer.setData('text/plain', id); setTimeout(() => block.style.opacity = '0.5', 0); };
    startResize = function(e) { const th = e.target.closest('th'); if (!th) return; const isCol = th.classList.contains('col-resizable'); const isRow = th.classList.contains('row-resizable'); if (!isCol && !isRow) return; resizing = { type: isCol ? 'col' : 'row', index: parseInt(isCol ? th.dataset.col : th.dataset.row), startPos: isCol ? e.pageX : e.pageY, startSize: isCol ? th.offsetWidth : th.parentElement.offsetHeight }; document.addEventListener('mousemove', handleResize); document.addEventListener('mouseup', endResize); };
    handleResize = function(e) { if (!resizing) return; const diff = (resizing.type === 'col' ? e.pageX : e.pageY) - resizing.startPos; const newSize = resizing.startSize + diff; if (resizing.type === 'col') { if (newSize > 50) appState.gridConfig.colWidths[resizing.index] = newSize; } else { if (newSize > 40) appState.gridConfig.rowHeights[resizing.index] = newSize; } renderGrid(); };
    endResize = function() { if (!resizing) return; resizing = null; document.removeEventListener('mousemove', handleResize); document.removeEventListener('mouseup', endResize); saveActiveSession(); };
    openTagsModal = function(attendeeBlock) { const attendeeId = parseInt(attendeeBlock.dataset.id); const cell = attendeeBlock.closest('td'); const { row, col } = cell.dataset; const key = `r${row}_c${col}`; const item = appState.gridContent[key].attendees.find(i => i.id === attendeeId); const attendee = appState.attendees.find(a => a.id === attendeeId); currentTaggingContext = { key, attendeeId }; tagModalAttendeeName.textContent = attendee.name; modalTagsList.innerHTML = appState.tags.map(tag => `<label class="flex items-center space-x-3"><input type="checkbox" class="form-checkbox h-5 w-5" data-tag-id="${tag.id}" ${(item.tags || []).includes(tag.id) ? 'checked' : ''}><span class="sidebar-tag" style="background-color: ${tag.color}; color: white;">${tag.name}</span></label>`).join(''); tagsModal.classList.remove('hidden'); };
    saveTags = function() { const { key, attendeeId } = currentTaggingContext; const item = appState.gridContent[key].attendees.find(i => i.id === attendeeId); const selectedTagIds = Array.from(modalTagsList.querySelectorAll('input:checked')).map(input => parseInt(input.dataset.tagId)); item.tags = selectedTagIds; tagsModal.classList.add('hidden'); renderGrid(); saveActiveSession(); };
    toggleTagFilter = function(tagId) { activeFilterTagId = activeFilterTagId === tagId ? null : tagId; renderTags(); renderGrid(); };
    let availState = { currentAttendee: null, availability: {}, dates: [] };
    function openAvailabilityModal(id) { availState.currentAttendee = appState.attendees.find(a => a.id === id); if (!availState.currentAttendee) return; document.getElementById('modal-attendee-name').textContent = availState.currentAttendee.name; availState.availability = JSON.parse(JSON.stringify(availState.currentAttendee.availability || {})); availState.dates = Object.keys(availState.availability).sort(); if (availState.dates.length === 0) { const today = new Date().toISOString().split('T')[0]; availState.dates.push(today); availState.availability[today] = Array(24).fill(false); } renderAvailabilityGrid(); document.getElementById('availability-modal').classList.remove('hidden'); };
    function renderAvailabilityGrid() { let table = '<table class="planner-table"><thead><tr><th>Time</th>'; availState.dates.forEach(date => { table += `<th>${formatDate(date)} <span class="remove-date-btn" data-date="${date}">&times;</span></th>`; }); table += '</tr></thead><tbody>'; for (let hour = 0; hour <= 23; hour++) { table += `<tr><td class="time-header">${formatTime(hour)}</td>`; availState.dates.forEach(date => { const hourIndex = hour; const isAvailable = availState.availability[date]?.[hourIndex] || false; table += `<td><div class="availability-slot ${isAvailable ? 'available' : ''}" data-date="${date}" data-hour="${hourIndex}"></div></td>`; }); table += '</tr>'; } table += '</tbody></table>'; document.getElementById('availability-grid-container').innerHTML = table; };
    function calculateHeatmapData() { const counts = {}, allDates = new Set(); appState.attendees.forEach(attendee => { for (const date in attendee.availability) { allDates.add(date); if (!counts[date]) counts[date] = {}; attendee.availability[date].forEach((isAvailable, hourIndex) => { if (isAvailable) counts[date][hourIndex] = (counts[date][hourIndex] || 0) + 1; }); } }); return { counts, dates: Array.from(allDates).sort(), totalAttendees: appState.attendees.length }; };
    function renderHeatmapGrid(c,d,t){ let table = '<table class="planner-table"><thead><tr><th>Time</th>'; d.forEach(date => table += `<th>${formatDate(date)}</th>`); table += '</tr></thead><tbody>'; for (let hour = 0; hour <= 23; hour++) { const hourIndex = hour; table += `<tr><td class="time-header">${formatTime(hour)}</td>`; d.forEach(date => { const count = c[date]?.[hourIndex] || 0; const opacity = t > 0 ? count / t : 0; table += `<td class="heatmap-cell" style="background-color: rgba(34, 197, 94, ${opacity});" data-date="${date}" data-hour="${hourIndex}">${count}</td>`; }); table += '</tr>'; } table += '</tbody></table>'; document.getElementById('heatmap-grid-container').innerHTML = table; };
    function generateAndShowHeatmap(){ const heatmapContainer = document.getElementById('heatmap-grid-container'); const heatmapModal = document.getElementById('heatmap-modal'); if (!appState.attendees || appState.attendees.length === 0) { heatmapContainer.innerHTML = '<p class="text-center text-gray-500">Please add attendees first.</p>'; heatmapModal.classList.remove('hidden'); return; } const { counts, dates, totalAttendees } = calculateHeatmapData(); if (dates.length === 0) { heatmapContainer.innerHTML = '<p class="text-center text-gray-500">No availability data entered.</p>'; heatmapModal.classList.remove('hidden'); return; } renderHeatmapGrid(counts, dates, totalAttendees); heatmapModal.classList.remove('hidden'); };
    function showHeatmapTooltip(c,e){ const { date, hour } = c.dataset; const hourIndex = parseInt(hour); const available = [], unavailable = []; appState.attendees.forEach(att => { (att.availability[date]?.[hourIndex] ? available : unavailable).push(att.name); }); const tooltip = document.createElement('div'); tooltip.id = 'heatmap-tooltip'; tooltip.innerHTML = `<h4>Available (${available.length})</h4><ul>${available.map(n=>`<li>${n}</li>`).join('')||'<li>None</li>'}</ul><h4 class="mt-2">Unavailable (${unavailable.length})</h4><ul>${unavailable.map(n=>`<li>${n}</li>`).join('')||'<li>None</li>'}</ul>`; document.body.appendChild(tooltip); const tooltipRect = tooltip.getBoundingClientRect(); const left = e.pageX + 15 + tooltipRect.width > window.innerWidth ? event.pageX - 15 - tooltipRect.width : e.pageX + 15; const top = e.pageY + 15 + tooltipRect.height > window.innerHeight ? event.pageY - 15 - tooltipRect.height : e.pageY + 15; tooltip.style.left = `${left}px`; tooltip.style.top = `${top}px`; };
    handleCSVImport = function(event) { const file = event.target.files[0]; if (!file) return; const startDateString = prompt("Enter the start date (Sunday) of the When2Meet event week (YYYY-MM-DD):"); if (!startDateString || !/^\d{4}-\d{2}-\d{2}$/.test(startDateString)) { importFeedback.textContent = "Invalid date format. Import cancelled."; return; } const reader = new FileReader(); reader.onload = (e) => { parseWhen2MeetCSV(e.target.result, startDateString); importFeedback.textContent = `Imported data from ${file.name}.`; csvFileInput.value = ''; importLinkModal.classList.add('hidden'); }; reader.readAsText(file); };
    parseWhen2MeetCSV = function(csvText, startDateString) { const lines = csvText.trim().split('\n'); const header = lines[0].split(';'); const names = header.slice(2).map(name => name.trim()); const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }; const startDate = new Date(`${startDateString}T00:00:00`); names.forEach(name => { let attendee = appState.attendees.find(a => a.name === name); if (!attendee) { attendee = { id: appState.nextAttendeeId++, name, color: getRandomColor(), availability: {} }; appState.attendees.push(attendee); } if (!attendee.availability) attendee.availability = {}; }); for (let i = 1; i < lines.length; i++) { const parts = lines[i].split(';'); if (parts.length < 3) continue; const [day, time, ...availabilities] = parts; const dayIndex = dayMap[day.trim()]; if (dayIndex === undefined) continue; const currentDate = new Date(startDate); currentDate.setDate(startDate.getDate() + dayIndex); const dateString = currentDate.toISOString().split('T')[0]; const [hourStr] = time.split(':'); const hour = parseInt(hourStr, 10); const hourIndex = hour; if (hourIndex < 0 || hourIndex > 23) continue; availabilities.forEach((isAvailable, nameIndex) => { if (isAvailable && isAvailable.trim() === '1') { const name = names[nameIndex]; const attendee = appState.attendees.find(a => a.name === name); if (attendee) { if (!attendee.availability[dateString]) attendee.availability[dateString] = Array(24).fill(false); attendee.availability[dateString][hourIndex] = true; } } }); } renderAll(); saveActiveSession(); };
    
    init();
});

