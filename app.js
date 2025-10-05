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
    
    // Tag Elements
    const tagNameInput = document.getElementById('tag-name-input');
    const addTagBtn = document.getElementById('add-tag-btn');
    const tagsList = document.getElementById('tags-list');
    const tagsModal = document.getElementById('tags-modal');
    const modalTagsList = document.getElementById('modal-tags-list');
    const tagModalAttendeeName = document.getElementById('tag-modal-attendee-name');
    const saveTagsBtn = document.getElementById('save-tags-btn');

    // --- App State ---
    let appState = {};
    let activeSessionName = '';
    let activeFilterTagId = null;
    
    const defaultState = {
        attendees: [],
        tags: [],
        gridContent: {},
        gridConfig: { rows: 5, cols: 5 },
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
        if (scheduleTable.rows.length > 1 && scheduleTable.rows[0].cells.length > 0) {
            appState.gridConfig = { rows: scheduleTable.tBodies[0].rows.length, cols: scheduleTable.rows[0].cells.length };
        } else {
             appState.gridConfig = { rows: 0, cols: 0 };
        }
        localStorage.setItem(activeSessionName, JSON.stringify(appState));
        const sessionKeys = JSON.parse(localStorage.getItem('scheduler_sessions')) || [];
        if (!sessionKeys.includes(activeSessionName)) {
            sessionKeys.push(activeSessionName);
            localStorage.setItem('scheduler_sessions', JSON.stringify(sessionKeys));
        }
        loadSessionList();
    }

    function loadSession(sessionName) {
        const savedState = localStorage.getItem(sessionName);
        appState = savedState ? JSON.parse(savedState) : { ...JSON.parse(JSON.stringify(defaultState)) };
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
        const { rows, cols } = appState.gridConfig;
        let tableHTML = '<thead><tr>';
        for (let i = 0; i < cols; i++) {
            tableHTML += `<th data-col="${i}" contenteditable="true">Column ${i + 1}</th>`;
        }
        tableHTML += '</tr></thead><tbody>';
        for (let i = 0; i < rows; i++) {
            tableHTML += `<tr>`;
            for (let j = 0; j < cols; j++) {
                const key = `r${i}_c${j}`;
                const content = appState.gridContent[key] || [];
                const blocksHTML = content.map(item => createAttendeeBlockHTML(item)).join('');
                tableHTML += `<td data-row="${i}" data-col="${j}">${blocksHTML}</td>`;
            }
            tableHTML += '</tr>';
        }
        tableHTML += '</tbody>';
        scheduleTable.innerHTML = tableHTML;
    }

    function renderAttendees() {
        attendeesList.innerHTML = appState.attendees.map(att => `
            <div id="attendee-${att.id}" class="attendee-block" style="background-color: ${att.color};" draggable="true">
                <div class="attendee-name-bar">
                    <span>${att.name}</span>
                    <div class="flex items-center ml-auto">
                        <button class="set-availability-btn text-xs text-white opacity-70 hover:opacity-100 p-1" data-id="${att.id}">Avail</button>
                        <button class="remove-attendee-btn text-xs text-white opacity-70 hover:opacity-100 p-1" data-id="${att.id}">X</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function createAttendeeBlockHTML(item) {
        const attendee = appState.attendees.find(a => a.id === item.id);
        if (!attendee) return '';
        
        const isFilteredOut = activeFilterTagId !== null && !item.tags.includes(activeFilterTagId);
        const tagsHTML = `<div class="attendee-tags-container">
            ${item.tags.map(tagId => {
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

    function renderTags() {
        tagsList.innerHTML = appState.tags.map(tag => `
            <div class="sidebar-tag ${activeFilterTagId === tag.id ? 'filter-active' : ''}" style="background-color: ${tag.color}; color: white;" data-tag-id="${tag.id}">
                ${tag.name}
            </div>
        `).join('');
    }

    // --- Grid & Attendee Controls ---
    function addGridRow() { appState.gridConfig.rows++; renderGrid(); saveActiveSession(); }
    function addGridColumn() { appState.gridConfig.cols++; renderGrid(); saveActiveSession(); }
    function removeGridRow() {
        if (appState.gridConfig.rows > 0) {
            const lastRow = appState.gridConfig.rows - 1;
            for (let j = 0; j < appState.gridConfig.cols; j++) {
                delete appState.gridContent[`r${lastRow}_c${j}`];
            }
            appState.gridConfig.rows--;
            renderGrid();
            saveActiveSession();
        }
    }
    function removeGridColumn() {
        if (appState.gridConfig.cols > 0) {
            const lastCol = appState.gridConfig.cols - 1;
             for (let i = 0; i < appState.gridConfig.rows; i++) {
                delete appState.gridContent[`r${i}_c${lastCol}`];
            }
            appState.gridConfig.cols--;
            renderGrid();
            saveActiveSession();
        }
    }
    
    function addAttendee() {
        const name = attendeeNameInput.value.trim();
        if (name) {
            const newAttendee = { id: appState.nextAttendeeId++, name, color: getRandomColor(), availability: {} };
            appState.attendees.push(newAttendee);
            attendeeNameInput.value = '';
            renderAttendees();
            saveActiveSession();
        }
    }

    // --- Tag Management ---
    function addTag() {
        const name = tagNameInput.value.trim();
        if (name) {
            const newTag = { id: appState.nextTagId++, name, color: getRandomColor(0.6) };
            appState.tags.push(newTag);
            tagNameInput.value = '';
            renderTags();
            saveActiveSession();
        }
    }
    
    let currentTaggingContext = null;
    function openTagsModal(attendeeBlock) {
        const attendeeId = parseInt(attendeeBlock.dataset.id);
        const cell = attendeeBlock.closest('td');
        const { row, col } = cell.dataset;
        const key = `r${row}_c${col}`;
        const item = appState.gridContent[key].find(i => i.id === attendeeId);
        const attendee = appState.attendees.find(a => a.id === attendeeId);

        currentTaggingContext = { key, attendeeId };
        tagModalAttendeeName.textContent = attendee.name;

        modalTagsList.innerHTML = appState.tags.map(tag => `
            <label class="flex items-center space-x-3">
                <input type="checkbox" class="form-checkbox h-5 w-5" data-tag-id="${tag.id}" ${item.tags.includes(tag.id) ? 'checked' : ''}>
                <span class="sidebar-tag" style="background-color: ${tag.color}; color: white;">${tag.name}</span>
            </label>
        `).join('');
        tagsModal.classList.remove('hidden');
    }

    function saveTags() {
        const { key, attendeeId } = currentTaggingContext;
        const item = appState.gridContent[key].find(i => i.id === attendeeId);
        const selectedTagIds = Array.from(modalTagsList.querySelectorAll('input:checked')).map(input => parseInt(input.dataset.tagId));
        item.tags = selectedTagIds;
        tagsModal.classList.add('hidden');
        renderGrid();
        saveActiveSession();
    }
    
    function toggleTagFilter(tagId) {
        if (activeFilterTagId === tagId) {
            activeFilterTagId = null;
        } else {
            activeFilterTagId = tagId;
        }
        renderTags();
        renderGrid();
    }

    // --- Drag and Drop Logic (Refactored) ---
    let draggedItem = null;
    
    function handleDragStart(e) {
        const block = e.target.closest('.attendee-block');
        if (!block) return;
        
        const id = parseInt(block.id?.split('-')[1] || block.dataset.id);
        const attendee = appState.attendees.find(a => a.id === id);
        
        draggedItem = { id, attendee };

        if (block.classList.contains('placed-attendee')) {
            const cell = block.closest('td');
            const { row, col } = cell.dataset;
            const key = `r${row}_c${col}`;
            draggedItem.sourceKey = key;
        }
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => block.style.opacity = '0.5', 0);
    }
    
    function handleDrop(e) {
        e.preventDefault();
        const cell = e.target.closest('td');
        if (!cell || !draggedItem) return;
        
        // Find the original item to preserve its tags
        let originalItem = { id: draggedItem.id, tags: [] };
        if(draggedItem.sourceKey) {
            const sourceItem = appState.gridContent[draggedItem.sourceKey].find(i => i.id === draggedItem.id);
            if(sourceItem) originalItem = sourceItem;
        }

        // Remove from original cell if it was moved from within the grid
        if (draggedItem.sourceKey) {
            appState.gridContent[draggedItem.sourceKey] = appState.gridContent[draggedItem.sourceKey].filter(i => i.id !== draggedItem.id);
        }

        const { row, col } = cell.dataset;
        const key = `r${row}_c${col}`;
        if (!appState.gridContent[key]) appState.gridContent[key] = [];
        
        // Add to new cell if not already there, preserving tags
        if (!appState.gridContent[key].some(i => i.id === draggedItem.id)) {
            appState.gridContent[key].push(originalItem);
        }
        
        draggedItem = null;
        saveActiveSession();
        renderGrid();
    }

    // --- Initial Setup & Event Listeners ---
    function init() {
        loadSessionBtn.addEventListener('click', () => { loadSession(sessionSelect.value); sessionModal.classList.add('hidden'); });
        newSessionBtn.addEventListener('click', () => {
            const newName = prompt("Enter name:", "New Session");
            if (newName) { loadSession(newName); saveActiveSession(); }
            sessionModal.classList.add('hidden');
        });
        saveSessionBtn.addEventListener('click', () => {
            const newName = sessionNameInput.value.trim();
            if (newName && newName !== activeSessionName) {
                deleteActiveSession();
                activeSessionName = newName;
            }
            saveActiveSession();
            alert(`Session '${activeSessionName}' saved!`);
        });
        deleteSessionBtn.addEventListener('click', () => {
            if (confirm(`Delete '${activeSessionName}'?`)) deleteActiveSession();
        });

        addAttendeeBtn.addEventListener('click', addAttendee);
        addRowBtn.addEventListener('click', addGridRow);
        addColBtn.addEventListener('click', addGridColumn);
        removeRowBtn.addEventListener('click', removeGridRow);
        removeColBtn.addEventListener('click', removeGridColumn);
        
        addTagBtn.addEventListener('click', addTag);
        saveTagsBtn.addEventListener('click', saveTags);
        tagsList.addEventListener('click', e => {
            const tagEl = e.target.closest('.sidebar-tag');
            if (tagEl) toggleTagFilter(parseInt(tagEl.dataset.tagId));
        });

        attendeesList.addEventListener('click', e => {
            const target = e.target;
            if (target.classList.contains('remove-attendee-btn')) {
                const id = parseInt(target.dataset.id);
                appState.attendees = appState.attendees.filter(a => a.id !== id);
                renderAttendees();
                saveActiveSession();
            }
            if (target.classList.contains('set-availability-btn')) {
                openAvailabilityModal(parseInt(target.dataset.id));
            }
        });

        mainContent.addEventListener('click', e => {
            if (e.target.classList.contains('assign-tags-btn')) {
                openTagsModal(e.target.closest('.placed-attendee'));
            }
        });
        
        attendeesList.addEventListener('dragstart', handleDragStart);
        mainContent.addEventListener('dragstart', handleDragStart);
        mainContent.addEventListener('dragover', e => e.preventDefault());
        mainContent.addEventListener('drop', handleDrop);
        mainContent.addEventListener('dragend', () => renderGrid());

        const sessionKeys = loadSessionList();
        if (sessionKeys.length > 0) {
            sessionModal.classList.remove('hidden');
        } else {
            sessionModal.classList.add('hidden');
            loadSession('My First Session');
        }
        
        // Unchanged Listeners
        const availabilityModal = document.getElementById('availability-modal');
        const closeModalBtn = document.getElementById('close-modal-btn');
        const availabilityDatePicker = document.getElementById('availability-date-picker');
        const addDateBtn = document.getElementById('add-date-btn');
        const availabilityGridContainer = document.getElementById('availability-grid-container');

        addDateBtn.addEventListener('click', () => {
            const date = availabilityDatePicker.value;
            if (date && !availState.dates.includes(date)) {
                availState.dates.push(date);
                availState.dates.sort();
                availState.availability[date] = Array(14).fill(false);
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
        closeModalBtn.addEventListener('click', () => {
            availState.currentAttendee.availability = availState.availability;
            availabilityModal.classList.add('hidden');
            saveActiveSession();
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

    // --- Helpers & Unchanged Functions ---
    const getRandomColor = (alpha = 1) => `hsla(${Math.random() * 360}, 70%, 50%, ${alpha})`;
    
    let availState = { currentAttendee: null, availability: {}, dates: [] };
    function openAvailabilityModal(attendeeId) {
        availState.currentAttendee = appState.attendees.find(a => a.id === attendeeId);
        if (!availState.currentAttendee) return;
        const modalAttendeeName = document.getElementById('modal-attendee-name');
        modalAttendeeName.textContent = availState.currentAttendee.name;
        availState.availability = JSON.parse(JSON.stringify(availState.currentAttendee.availability));
        availState.dates = Object.keys(availState.availability).sort();
        if (availState.dates.length === 0) {
            const today = new Date().toISOString().split('T')[0];
            availState.dates.push(today);
            availState.availability[today] = Array(14).fill(false);
        }
        renderAvailabilityGrid();
        document.getElementById('availability-modal').classList.remove('hidden');
    };
    function renderAvailabilityGrid() {
        let table = '<table class="planner-table"><thead><tr><th>Time</th>';
        availState.dates.forEach(date => {
            table += `<th>${formatDate(date)} <span class="remove-date-btn" data-date="${date}">&times;</span></th>`;
        });
        table += '</tr></thead><tbody>';
        for (let hour = 8; hour <= 21; hour++) {
            table += `<tr><td class="time-header">${formatTime(hour)}</td>`;
            availState.dates.forEach(date => {
                const hourIndex = hour - 8;
                const isAvailable = availState.availability[date]?.[hourIndex] || false;
                table += `<td><div class="availability-slot ${isAvailable ? 'available' : ''}" data-date="${date}" data-hour="${hourIndex}"></div></td>`;
            });
            table += '</tr>';
        }
        table += '</tbody></table>';
        document.getElementById('availability-grid-container').innerHTML = table;
    };
    function calculateHeatmapData() {
        const counts = {};
        const allDates = new Set();
        appState.attendees.forEach(attendee => {
            for (const date in attendee.availability) {
                allDates.add(date);
                if (!counts[date]) counts[date] = {};
                attendee.availability[date].forEach((isAvailable, hourIndex) => {
                    if (isAvailable) {
                        counts[date][hourIndex] = (counts[date][hourIndex] || 0) + 1;
                    }
                });
            }
        });
        return { counts, dates: Array.from(allDates).sort(), totalAttendees: appState.attendees.length };
    };
    function renderHeatmapGrid(counts, dates, totalAttendees) {
        let table = '<table class="planner-table"><thead><tr><th>Time</th>';
        dates.forEach(date => table += `<th>${formatDate(date)}</th>`);
        table += '</tr></thead><tbody>';
        for (let hour = 8; hour <= 21; hour++) {
            const hourIndex = hour - 8;
            table += `<tr><td class="time-header">${formatTime(hour)}</td>`;
            dates.forEach(date => {
                const count = counts[date]?.[hourIndex] || 0;
                const opacity = totalAttendees > 0 ? count / totalAttendees : 0;
                table += `<td class="heatmap-cell" style="background-color: rgba(34, 197, 94, ${opacity});" data-date="${date}" data-hour="${hourIndex}">${count}</td>`;
            });
            table += '</tr>';
        }
        table += '</tbody></table>';
        document.getElementById('heatmap-grid-container').innerHTML = table;
    };
    function generateAndShowHeatmap() {
        if (!appState.attendees || appState.attendees.length === 0) {
            document.getElementById('heatmap-grid-container').innerHTML = '<p class="text-center text-gray-500">Please add attendees first.</p>';
            document.getElementById('heatmap-modal').classList.remove('hidden');
            return;
        }
        const { counts, dates, totalAttendees } = calculateHeatmapData();
        if (dates.length === 0) {
            document.getElementById('heatmap-grid-container').innerHTML = '<p class="text-center text-gray-500">No availability data entered.</p>';
            document.getElementById('heatmap-modal').classList.remove('hidden');
            return;
        }
        renderHeatmapGrid(counts, dates, totalAttendees);
        document.getElementById('heatmap-modal').classList.remove('hidden');
    };
    function showHeatmapTooltip(cell, event) {
        const { date, hour } = cell.dataset;
        const hourIndex = parseInt(hour);
        const available = [], unavailable = [];
        appState.attendees.forEach(att => {
            (att.availability[date]?.[hourIndex] ? available : unavailable).push(att.name);
        });
        const tooltip = document.createElement('div');
        tooltip.id = 'heatmap-tooltip';
        tooltip.innerHTML = `<h4>Available (${available.length})</h4><ul>${available.map(n=>`<li>${n}</li>`).join('')||'<li>None</li>'}</ul><h4 class="mt-2">Unavailable (${unavailable.length})</h4><ul>${unavailable.map(n=>`<li>${n}</li>`).join('')||'<li>None</li>'}</ul>`;
        document.body.appendChild(tooltip);
        const tooltipRect = tooltip.getBoundingClientRect();
        const left = event.pageX + 15 + tooltipRect.width > window.innerWidth ? event.pageX - 15 - tooltipRect.width : event.pageX + 15;
        const top = event.pageY + 15 + tooltipRect.height > window.innerHeight ? event.pageY - 15 - tooltipRect.height : event.pageY + 15;
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    };
    const formatDate = (dateStr) => new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    const formatTime = (hour) => `${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 || hour === 24 ? 'AM' : 'PM'}`;
    
    init();
});

