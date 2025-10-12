document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const scheduleTable = document.getElementById('schedule-table');
    const attendeesList = document.getElementById('attendees-list');
    const mainContent = document.getElementById('main-content');
    const sessionModal = document.getElementById('session-modal');
    const sessionSelect = document.getElementById('session-select');
    const sessionNameInput = document.getElementById('session-name');
    const saveSessionBtn = document.getElementById('save-session-btn');
    const deleteSessionBtn = document.getElementById('delete-session-btn');
    const loadSessionBtn = document.getElementById('load-session-btn');
    const newSessionBtn = document.getElementById('new-session-btn');
    const addRowBtn = document.getElementById('add-row-btn');
    const addColBtn = document.getElementById('add-col-btn');
    const removeRowBtn = document.getElementById('remove-row-btn');
    const removeColBtn = document.getElementById('remove-col-btn');
    const attendeeNameInput = document.getElementById('attendee-name');
    const addAttendeeBtn = document.getElementById('add-attendee-btn');
    const viewHeatmapBtn = document.getElementById('view-heatmap-btn');
    const importFromLinkBtn = document.getElementById('import-from-link-btn');
    const importLinkModal = document.getElementById('import-link-modal');
    const closeImportLinkModalBtn = document.getElementById('close-import-link-modal-btn');
    const copyScriptBtn = document.getElementById('copy-script-btn');
    const w2mLink = document.getElementById('w2m-link');
    const csvFileInput = document.getElementById('csv-file-input');
    const importFeedback = document.getElementById('import-feedback');
    const tagNameInput = document.getElementById('tag-name-input');
    const addTagBtn = document.getElementById('add-tag-btn');
    const tagsList = document.getElementById('tags-list');
    const tagsModal = document.getElementById('tags-modal');
    const modalTagsList = document.getElementById('modal-tags-list');
    const tagModalAttendeeName = document.getElementById('tag-modal-attendee-name');
    const saveTagsBtn = document.getElementById('save-tags-btn');
    const mergeCellsBtn = document.getElementById('merge-cells-btn');
    const toolbarFontSize = document.getElementById('toolbar-font-size');
    const toolbarTextColor = document.getElementById('toolbar-text-color');
    const toolbarBgColor = document.getElementById('toolbar-bg-color');
    const mainToolbar = document.getElementById('main-toolbar');
    const cellEditorModal = document.getElementById('cell-editor-modal');
    const closeCellEditorBtn = document.getElementById('close-cell-editor-btn');
    const saveCellBtn = document.getElementById('save-cell-btn');
    const deleteBin = document.getElementById('delete-bin');
    const masterTaskEditorModal = document.getElementById('master-task-editor-modal');
    const closeMasterTaskEditorBtn = document.getElementById('close-master-task-editor-btn');
    const saveMasterTaskBtn = document.getElementById('save-master-task-btn');
    const addMasterTaskBtn = document.getElementById('add-master-task-btn');
    const masterTasksList = document.getElementById('master-tasks-list');
    const suggestTaskDateBtn = document.getElementById('suggest-task-date-btn');
    const taskSuggestionModal = document.getElementById('task-suggestion-modal');
    const closeTaskSuggestionBtn = document.getElementById('close-task-suggestion-btn');
    const taskSuggestionSelect = document.getElementById('task-suggestion-select');
    const taskSuggestionResults = document.getElementById('task-suggestion-results');
    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    const sidebar = document.getElementById('sidebar');

    // --- App State ---
    let appState = {};
    let activeSessionName = '';
    let activeFilterTagId = null;
    let selectedCells = [];
    let selectionStartCell = null;
    let currentEditingMasterTaskId = null;
    let currentEditingCellKey = null;
    
    const defaultState = {
        attendees: [], tags: [], gridContent: {}, masterTasks: [],
        gridConfig: { 
            rows: 5, cols: 7, 
            rowHeights: {}, colWidths: {}, 
            merges: {}, dateHeaders: [] 
        },
        nextAttendeeId: 0, nextTagId: 0, nextMasterTaskId: 0
    };
    
    // --- Session & Core Rendering ---
    function loadSession(sessionName) {
        try {
            const savedState = localStorage.getItem(sessionName);
            appState = savedState ? JSON.parse(savedState) : { ...JSON.parse(JSON.stringify(defaultState)) };
            if (!appState.masterTasks) appState.masterTasks = [];
            if (!appState.gridConfig.merges) appState.gridConfig.merges = {};
        } catch (error) {
            console.error("Failed to load session, resetting.", error);
            appState = { ...JSON.parse(JSON.stringify(defaultState)) };
        }
        activeSessionName = sessionName;
        sessionNameInput.value = sessionName;
        renderAll();
    }
    
    function renderAll() { renderGrid(); renderAttendees(); renderTags(); renderMasterTasks(); }

    function renderGrid() {
        if (!appState.gridConfig) return;
        const { rows, cols, rowHeights, colWidths, merges, dateHeaders } = appState.gridConfig;
        let tableHTML = '<thead><tr><th></th>';
        for (let i = 0; i < cols; i++) {
            const width = colWidths && colWidths[i] ? `style="width: ${colWidths[i]}px;"` : '';
            const dateHeader = dateHeaders && dateHeaders[i] ? formatDate(dateHeaders[i]) : `Column ${i + 1}`;
            tableHTML += `<th data-col="${i}" contenteditable="true" class="col-resizable" ${width}>${dateHeader}</th>`;
        }
        tableHTML += '</tr></thead><tbody>';

        const mergedCellsToSkip = new Set();
        if (merges) {
            Object.values(merges).forEach(merge => {
                for (let r = merge.startRow; r <= merge.endRow; r++) {
                    for (let c = merge.startCol; c <= merge.endCol; c++) {
                        if (r !== merge.startRow || c !== merge.startCol) {
                            mergedCellsToSkip.add(`r${r}_c${c}`);
                        }
                    }
                }
            });
        }

        for (let i = 0; i < rows; i++) {
            const height = rowHeights && rowHeights[i] ? `style="height: ${rowHeights[i]}px;"` : '';
            tableHTML += `<tr data-row="${i}" ${height}><th data-row="${i}" class="row-resizable" contenteditable="true">R${i+1}</th>`;
            for (let j = 0; j < cols; j++) {
                const key = `r${i}_c${j}`;
                if (mergedCellsToSkip.has(key)) continue;

                const cellData = appState.gridContent[key] || {};
                const mergeInfo = merges ? merges[key] : null;
                const colspan = mergeInfo ? `colspan="${mergeInfo.endCol - mergeInfo.startCol + 1}"` : '';
                const rowspan = mergeInfo ? `rowspan="${mergeInfo.endRow - mergeInfo.startRow + 1}"` : '';
                
                let styles = `background-color: ${cellData.bgColor || 'transparent'};`;
                let textStyles = `--cell-font-size: ${cellData.fontSize||'14px'}; --cell-text-color: ${cellData.textColor||'#333'}; --cell-text-align: ${cellData.textAlign||'left'};`;
                let cellContentHTML = `<div class="cell-content" style="${textStyles}">`;
                if(cellData.image) cellContentHTML += `<img src="${cellData.image}" class="cell-image" alt="" onerror="this.style.display='none'">`;
                if(cellData.text) cellContentHTML += `<div class="cell-text">${cellData.text.replace(/\n/g, '<br>')}</div>`;
                if(cellData.attendees?.length > 0) {
                     cellContentHTML += '<div class="cell-attendees-container">';
                     cellContentHTML += cellData.attendees.map(item => createAttendeeBlockHTML(item)).join('');
                     cellContentHTML += '</div>';
                }
                 if(cellData.tasks?.length > 0) {
                     cellContentHTML += '<div class="cell-tasks-container">';
                     cellContentHTML += cellData.tasks.map(taskId => {
                         const task = appState.masterTasks.find(t => t.id === taskId);
                         if (!task) return '';
                         const picNames = (task.picAttendeeIds || []).map(id => appState.attendees.find(a => a.id === id)?.name || 'N/A').join(', ');
                         return `<div class="task-item">${task.title} <strong>(${picNames})</strong></div>`;
                     }).join('');
                     cellContentHTML += '</div>';
                }
                cellContentHTML += '</div>';
    
                tableHTML += `<td data-row="${i}" data-col="${j}" style="${styles}" ${colspan} ${rowspan}>${cellContentHTML}</td>`;
            }
            tableHTML += '</tr>';
        }
        tableHTML += '</tbody></table>';
        scheduleTable.innerHTML = tableHTML;
        updateSelectionUI();
        lucide.createIcons();
    }
    
    function createAttendeeBlockHTML(item) {
        const attendee = appState.attendees.find(t => t.id === item.id);
        if (!attendee) return "";
        const isFilteredOut = activeFilterTagId !== null && !(item.tags || []).includes(activeFilterTagId);
        const tagsHTML = `<div class="attendee-tags-container">${(item.tags || []).map(tagId => {
            const tag = appState.tags.find(t => t.id === tagId);
            return tag ? `<span class="attendee-tag" style="background-color: ${tag.color};">${tag.name}</span>` : "";
        }).join("")}</div>`;
        return `
            <div class="attendee-block placed-attendee ${isFilteredOut ? "filtered-out" : ""}" data-id="${attendee.id}" style="background-color: ${attendee.color};" draggable="true">
                <div class="attendee-name-bar">
                    <span class="flex-grow">${attendee.name}</span>
                    <button class="assign-tags-btn text-xs text-white opacity-70 hover:opacity-100 p-1 ml-auto">Tags</button>
                </div>
                ${tagsHTML}
            </div>
        `;
    }

    function renderAttendees() {
        attendeesList.innerHTML = appState.attendees.map(e => `<div id="attendee-${e.id}" class="sidebar-item" style="background-color: ${e.color};" draggable="true"><div class="attendee-name-bar"><span>${e.name}</span><div class="flex items-center ml-auto"><button class="set-availability-btn text-xs text-white opacity-70 hover:opacity-100 p-1" data-id="${e.id}">Avail</button><button class="remove-attendee-btn text-xs text-white opacity-70 hover:opacity-100 p-1" data-id="${e.id}">X</button></div></div></div>`).join("");
    }

    function renderTags() {
        tagsList.innerHTML = appState.tags.map(e => `<div class="sidebar-tag ${activeFilterTagId === e.id ? "filter-active" : ""}" style="background-color: ${e.color}; color: white;" data-tag-id="${e.id}" draggable="true">${e.name}</div>`).join("");
    }
    
    function renderMasterTasks() {
        masterTasksList.innerHTML = (appState.masterTasks || []).map(task => {
            return `
                <div class="sidebar-item" style="background-color: #f3f4f6; color: #374151;" draggable="true" data-task-id="${task.id}">
                    <span>${task.title}</span>
                    <button class="edit-master-task-btn text-xs" data-task-id="${task.id}">Edit</button>
                </div>
            `;
        }).join('');
    }

    function showSuggestionPopover(cell) {
        const col = parseInt(cell.dataset.col);
        const date = appState.gridConfig.dateHeaders[col];
        if (!date) return;
        const availabilityByHour = Array(24).fill(0).map(() => ({ count: 0, names: [] }));
        let maxAvailable = 0;
        appState.attendees.forEach(attendee => {
            if (attendee.availability && attendee.availability[date]) {
                attendee.availability[date].forEach((isAvailable, hour) => {
                    if (isAvailable) {
                        availabilityByHour[hour].count++;
                        availabilityByHour[hour].names.push(attendee.name);
                        if (availabilityByHour[hour].count > maxAvailable) maxAvailable = availabilityByHour[hour].count;
                    }
                });
            }
        });
        
        const bestGeneralHours = [];
        if (maxAvailable > 0) {
            for (let i = 0; i < 24; i++) {
                if (availabilityByHour[i].count === maxAvailable) {
                    bestGeneralHours.push(formatTime(i));
                }
            }
        }
        
        const key = `r${cell.dataset.row}_c${cell.dataset.col}`;
        const cellData = appState.gridContent[key] || {};
        const tasks = (cellData.tasks || []).map(taskId => appState.masterTasks.find(t => t.id === taskId)).filter(Boolean);
        let taskContent = '';

        if (tasks.length > 0) {
            taskContent += `<div class="task-suggestions-container"><h4>Task Availability</h4>`;
            tasks.forEach(task => {
                const requiredAttendees = new Set(task.picAttendeeIds || []);
                (task.requiredTagIds || []).forEach(tagId => {
                    appState.attendees.forEach(attendee => {
                        if((attendee.tags || []).includes(tagId)){
                            requiredAttendees.add(attendee.id);
                        }
                    });
                });
                
                const requiredPpl = [...requiredAttendees].map(id => appState.attendees.find(a => a.id === id)).filter(Boolean);

                if (requiredPpl.length === 0) {
                     taskContent += `<div class="task-suggestion"><strong>${task.title}:</strong> No people required.</div>`;
                     return;
                }

                let bestHourForTask = -1;
                let maxAvailableForTask = -1;

                for (let hour = 0; hour < 24; hour++) {
                    let currentHourAvailable = 0;
                    requiredPpl.forEach(p => {
                        if (p.availability?.[date]?.[hour]) {
                            currentHourAvailable++;
                        }
                    });
                    if (currentHourAvailable > maxAvailableForTask) {
                        maxAvailableForTask = currentHourAvailable;
                        bestHourForTask = hour;
                    }
                }
                
                const fitPercentage = (maxAvailableForTask / requiredPpl.length) * 100;
                
                taskContent += `<div class="task-suggestion">`;
                taskContent += `<strong>${task.title} - ${fitPercentage.toFixed(0)}% Fit</strong>`;
                taskContent += `<br><small>Best time: ${formatTime(bestHourForTask)} (${maxAvailableForTask}/${requiredPpl.length} available)</small>`;
                taskContent += `</div>`;
            });
            taskContent += `</div>`;
        }

        const popover = document.createElement('div');
        popover.id = 'suggestion-popover';
        let content = `<h4>Suggestions for ${formatDate(date)}</h4>`;
        
        if (bestGeneralHours.length > 0) {
            content += `<div class="best-times"><strong>Best Times (Overall):</strong> ${bestGeneralHours.join(', ')} (${maxAvailable} people)</div>`;
        } else {
            content += `<div class="best-times">No one is available on this day.</div>`;
        }

        if (taskContent) {
            content += taskContent;
        }
        
        popover.innerHTML = content;
        document.body.appendChild(popover);

        const rect = cell.getBoundingClientRect();
        const popoverRect = popover.getBoundingClientRect();

        let left = rect.right + 10;
        if (left + popoverRect.width > window.innerWidth) {
            left = rect.left - popoverRect.width - 10;
        }
        
        popover.style.left = `${left}px`;
        popover.style.top = `${window.scrollY + rect.top}px`;
    }
    
    function hideSuggestionPopover() {
        document.getElementById('suggestion-popover')?.remove();
    }

    function handleSelection(e) {
        const cell = e.target.closest('td');
        if (!cell) return;
        const currentCellCoords = { row: parseInt(cell.dataset.row), col: parseInt(cell.dataset.col) };
        if (e.shiftKey && selectionStartCell) {
            selectedCells = [];
            const start = selectionStartCell; const end = currentCellCoords;
            const minRow = Math.min(start.row, end.row), maxRow = Math.max(start.row, end.row);
            const minCol = Math.min(start.col, end.col), maxCol = Math.max(start.col, end.col);
            for (let r = minRow; r <= maxRow; r++) {
                for (let c = minCol; c <= maxCol; c++) selectedCells.push({ row: r, col: c });
            }
        } else if (e.ctrlKey || e.metaKey) {
            const cellIndex = selectedCells.findIndex(c => c.row === currentCellCoords.row && c.col === currentCellCoords.col);
            if (cellIndex > -1) selectedCells.splice(cellIndex, 1);
            else selectedCells.push(currentCellCoords);
            selectionStartCell = currentCellCoords;
        } else {
            selectedCells = [currentCellCoords];
            selectionStartCell = currentCellCoords;
        }
        updateSelectionUI();
    }

    function updateSelectionUI() {
        document.querySelectorAll('.cell-selected').forEach(c => c.classList.remove('cell-selected'));
        selectedCells.forEach(({ row, col }) => {
            const cell = scheduleTable.querySelector(`td[data-row="${row}"][data-col="${col}"]`);
            if (cell) cell.classList.add('cell-selected');
        });
    }

    function mergeSelectedCells() {
        if (selectedCells.length < 2) return;
        const rows = selectedCells.map(c => c.row);
        const cols = selectedCells.map(c => c.col);
        const minRow = Math.min(...rows), maxRow = Math.max(...rows);
        const minCol = Math.min(...cols), maxCol = Math.max(...cols);
        const mergeKey = `r${minRow}_c${minCol}`;
        if (appState.gridConfig.merges[mergeKey]) {
            delete appState.gridConfig.merges[mergeKey];
        } else {
            if (selectedCells.length !== (maxRow - minRow + 1) * (maxCol - minCol + 1)) {
                alert("Please select a solid rectangular block of cells to merge.");
                return;
            }
            appState.gridConfig.merges[mergeKey] = { startRow: minRow, startCol: minCol, endRow: maxRow, endCol: maxCol };
        }
        renderGrid();
        saveActiveSession();
    }
    
    function applyStyleToSelectedCells(style, value) {
        selectedCells.forEach(({row, col}) => {
            const key = `r${row}_c${col}`;
            if (!appState.gridContent[key]) appState.gridContent[key] = { attendees: [] };
            appState.gridContent[key][style] = value;
        });
        renderGrid();
        saveActiveSession();
    }
    
    function loadSessionList() {
        const e = JSON.parse(localStorage.getItem("scheduler_sessions")) || [];
        sessionSelect.innerHTML = e.map(e => `<option value="${e}">${e}</option>`).join("");
        return e;
    }

    function saveActiveSession() {
        if (!activeSessionName) return;
        localStorage.setItem(activeSessionName, JSON.stringify(appState));
        const e = JSON.parse(localStorage.getItem("scheduler_sessions")) || [];
        e.includes(activeSessionName) || (e.push(activeSessionName), localStorage.setItem("scheduler_sessions", JSON.stringify(e))), loadSessionList();
    }

    function deleteActiveSession() {
        if (activeSessionName) {
            localStorage.removeItem(activeSessionName);
            let e = JSON.parse(localStorage.getItem("scheduler_sessions")) || [];
            e = e.filter(e => e !== activeSessionName), localStorage.setItem("scheduler_sessions", JSON.stringify(e)), loadSession(e.length > 0 ? e[0] : "New Session"), loadSessionList();
        }
    }

    function openCellEditorModal(e) {
        const { row: t, col: a } = e.dataset;
        currentEditingCellKey = `r${t}_c${a}`;
        const n = appState.gridContent[currentEditingCellKey] || {};
        document.getElementById("cell-text-input").value = n.text || "";
        document.getElementById("cell-image-input").value = n.image || "";
        cellEditorModal.classList.remove("hidden");
    }

    function saveCellChanges() {
        if (currentEditingCellKey) {
            const e = currentEditingCellKey;
            appState.gridContent[e] || (appState.gridContent[e] = { attendees: [] });
            appState.gridContent[e].text = document.getElementById("cell-text-input").value.trim();
            appState.gridContent[e].image = document.getElementById("cell-image-input").value.trim();
            cellEditorModal.classList.add("hidden"), currentEditingCellKey = null, renderGrid(), saveActiveSession();
        }
    }
    const w2mScraperScript = `function getCSV({delimiter=";",timeFormat="24-hour"}={}){if("undefined"==typeof PeopleNames||"undefined"==typeof PeopleIDs||"undefined"==typeof AvailableAtSlot||"undefined"==typeof TimeOfSlot)return void alert("This script must be run on a When2Meet event page.");let result="Day"+delimiter+"Time"+delimiter+PeopleNames.join(delimiter)+"\\n";for(let i=0;i<AvailableAtSlot.length;i++){let slot=new Date(1e3*TimeOfSlot[i]);if(!slot)continue;let day=slot.toLocaleDateString("en-US",{weekday:"short"}),time=slot.toLocaleTimeString("en-US",{hour12:"12-hour"===timeFormat,hour:"2-digit",minute:"2-digit"});result+=day+delimiter+time+delimiter,result+=PeopleIDs.map(id=>AvailableAtSlot[i].includes(id)?1:0).join(delimiter),result+="\\n"}return result}function downloadCSV({filename:filename,delimiter:delimiter=";",timeFormat:timeFormat="24-hour"}={}){const urlParams=new URLSearchParams(window.location.search),uniqueCode=urlParams.keys().next().value||"UNKNOWNCODE",timestamp=(new Date).toISOString().slice(0,19).replace(/[:]/g,"");filename||(filename=\`when2meet_\${uniqueCode}_\${timestamp}.csv\`);const content=getCSV({delimiter:delimiter,timeFormat:timeFormat});if(!content)return;const bom="\\uFEFF",file=new Blob([bom+content],{type:"text/csv;charset=utf-8;"}),link=document.createElement("a");link.href=URL.createObjectURL(file),link.download=filename,document.body.appendChild(link),link.click(),document.body.removeChild(link),URL.revokeObjectURL(link.href)}downloadCSV();`;

    function handleCSVImport(e) {
        const t = e.target.files[0];
        if (t) {
            const e = prompt("Enter the start date (Sunday) of the When2Meet event week (YYYY-MM-DD):");
            if (e && /^\d{4}-\d{2}-\d{2}$/.test(e)) {
                const a = new FileReader;
                a.onload = a => {
                    parseWhen2MeetCSV(a.target.result, e), importFeedback.textContent = `Imported data from ${t.name}.`, csvFileInput.value = "", importLinkModal.classList.add("hidden")
                }, a.readAsText(t)
            } else importFeedback.textContent = "Invalid date format. Import cancelled."
        }
    }

    function parseWhen2MeetCSV(csvText, startDateString) {
        const lines = csvText.trim().split('\n');
        const dayStrings = lines.slice(1).map(line => line.split(';')[0].trim());
        const uniqueDays = [...new Set(dayStrings)];
        const names = lines[0].split(';').slice(2).map(name => name.trim());
        const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
        
        const startDate = new Date(startDateString);
        startDate.setMinutes(startDate.getMinutes() + startDate.getTimezoneOffset());

        appState.gridConfig.dateHeaders = uniqueDays.map(day => {
            const dayIndex = dayMap[day];
            if (dayIndex === undefined) return null;
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + dayIndex);
            return currentDate.toISOString().split('T')[0];
        }).filter(Boolean).sort();

        appState.gridConfig.cols = appState.gridConfig.dateHeaders.length;
        
        names.forEach(name => {
            if (!appState.attendees.some(a => a.name === name)) {
                addAttendee(name);
            }
        });

        for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split(';');
            if (parts.length < 3) continue;
            const [day, time, ...availabilities] = parts;
            const dayIndex = dayMap[day.trim()];
            if (dayIndex === undefined) continue;
            
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + dayIndex);
            const dateString = currentDate.toISOString().split("T")[0];

            if(!appState.gridConfig.dateHeaders.includes(dateString)) continue;

            const [hourStr] = time.split(':');
            const hour = parseInt(hourStr, 10);
            const hourIndex = hour;
            if (hourIndex < 0 || hourIndex > 23) continue;

            availabilities.forEach((isAvailable, nameIndex) => {
                if (isAvailable && isAvailable.trim() === '1') {
                    const name = names[nameIndex];
                    const attendee = appState.attendees.find(a => a.name === name);
                    if (attendee) {
                        if (!attendee.availability[dateString]) attendee.availability[dateString] = Array(24).fill(false);
                        attendee.availability[dateString][hourIndex] = true;
                    }
                }
            });
        }
        renderAll();
        saveActiveSession();
    }

    function addGridRow() {
        appState.gridConfig.rows++, renderGrid(), saveActiveSession()
    }

    function addGridColumn() {
        appState.gridConfig.cols++, renderGrid(), saveActiveSession()
    }

    function removeGridRow() {
        if (appState.gridConfig.rows > 0) {
            const e = {};
            appState.gridConfig.rows--;
            for (let t = 0; t < appState.gridConfig.rows; t++)
                for (let a = 0; a < appState.gridConfig.cols; a++) {
                    const n = `r${t}_c${a}`;
                    appState.gridContent[n] && (e[n] = appState.gridContent[n])
                }
            appState.gridContent = e, delete appState.gridConfig.rowHeights[appState.gridConfig.rows], renderGrid(), saveActiveSession()
        }
    }

    function removeGridColumn() {
        if (appState.gridConfig.cols > 0) {
            const e = {};
            appState.gridConfig.cols--;
            for (let t = 0; t < appState.gridConfig.rows; t++)
                for (let a = 0; a < appState.gridConfig.cols; a++) {
                    const n = `r${t}_c${a}`;
                    appState.gridContent[n] && (e[n] = appState.gridContent[n])
                }
            appState.gridContent = e, delete appState.gridConfig.colWidths[appState.gridConfig.cols], renderGrid(), saveActiveSession()
        }
    }

    function addAttendee(e) {
        const t = e && "string" == typeof e ? e : attendeeNameInput.value.trim();
        t && (appState.attendees.push({
            id: appState.nextAttendeeId++,
            name: t,
            color: getRandomColor(),
            availability: {}
        }), attendeeNameInput.value = "", renderAttendees(), saveActiveSession())
    }

    function addTag() {
        const e = tagNameInput.value.trim();
        e && (appState.tags.push({
            id: appState.nextTagId++,
            name: e,
            color: getRandomColor(.8)
        }), tagNameInput.value = "", renderTags(), saveActiveSession())
    }
    let currentTaggingContext = null;

    function openTagsModal(e) {
        const t = parseInt(e.dataset.id),
            a = e.closest("td"),
            {
                row: n,
                col: o
            } = a.dataset,
            d = `r${n}_c${o}`,
            r = appState.gridContent[d].attendees.find(e => e.id === t),
            i = appState.attendees.find(e => e.id === t);
        currentTaggingContext = {
            key: d,
            attendeeId: t
        }, tagModalAttendeeName.textContent = i.name, modalTagsList.innerHTML = appState.tags.map(e => `<label class="flex items-center space-x-3"><input type="checkbox" class="form-checkbox h-5 w-5" data-tag-id="${e.id}" ${(r.tags||[]).includes(e.id)?"checked":""}><span class="sidebar-tag" style="background-color: ${e.color}; color: white;">${e.name}</span></label>`).join(""), tagsModal.classList.remove("hidden")
    }

    function saveTags() {
        const {
            key: e,
            attendeeId: t
        } = currentTaggingContext, a = appState.gridContent[e].attendees.find(e => e.id === t), n = Array.from(modalTagsList.querySelectorAll("input:checked")).map(e => parseInt(e.dataset.tagId));
        a.tags = n, tagsModal.classList.add("hidden"), renderGrid(), saveActiveSession()
    }

    function toggleTagFilter(e) {
        activeFilterTagId = activeFilterTagId === e ? null : e, renderTags(), renderGrid()
    }
    let draggedItem = null;

    function handleDragStart(e) {
        const t = e.target.closest(".attendee-block, .sidebar-tag, .sidebar-item");
        if (t) {
            let a;
            if (t.classList.contains("sidebar-tag")) a = {
                type: "tag",
                id: parseInt(t.dataset.tagId)
            };
            else if(t.dataset.taskId) {
                a = {
                    type: "master-task",
                    id: parseInt(t.dataset.taskId)
                };
            }
            else {
                const e = parseInt(t.id?.split("-")[1] || t.dataset.id);
                a = {
                    type: "attendee",
                    id: e,
                    sourceKey: t.classList.contains("placed-attendee") ? `r${t.closest("td").dataset.row}_c${t.closest("td").dataset.col}` : null
                }
            }
            e.dataTransfer.setData("application/json", JSON.stringify(a));
            setTimeout(() => t.style.opacity = "0.5", 0);
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        const data = JSON.parse(e.dataTransfer.getData("application/json"));
        const targetCell = e.target.closest("td");
        const onSidebar = e.target.closest("#sidebar");

        if (onSidebar && data.sourceKey) {
             const sourceCellData = appState.gridContent[data.sourceKey];
             if (sourceCellData && sourceCellData.attendees) {
                sourceCellData.attendees = sourceCellData.attendees.filter(att => att.id !== data.id);
             }
        }
        else if (targetCell) {
            const key = `r${targetCell.dataset.row}_c${targetCell.dataset.col}`;
            appState.gridContent[key] || (appState.gridContent[key] = { attendees: [], text: '', image: '', bgColor: '', tasks: [] });

            if (data.type === 'attendee') {
                appState.gridContent[key].attendees || (appState.gridContent[key].attendees = []);
                let itemToAdd = { id: data.id, tags: [] };
                if (data.sourceKey) {
                    const sourceCellData = appState.gridContent[data.sourceKey];
                    const itemIndex = sourceCellData.attendees.findIndex(i => i.id === data.id);
                    if (itemIndex > -1) itemToAdd = sourceCellData.attendees.splice(itemIndex, 1)[0];
                }
                if (!appState.gridContent[key].attendees.some(i => i.id === data.id)) {
                    appState.gridContent[key].attendees.push(itemToAdd);
                }
            } else if (data.type === 'master-task') {
                appState.gridContent[key].tasks || (appState.gridContent[key].tasks = []);
                if (!appState.gridContent[key].tasks.includes(data.id)) {
                    appState.gridContent[key].tasks.push(data.id);
                }
            }
        }
        renderAll();
        saveActiveSession();
    }
    let resizing = null;

    function startResize(e) {
        const t = e.target.closest("th");
        if (t) {
            const a = t.classList.contains("col-resizable"),
                n = t.classList.contains("row-resizable");
            !a && !n || (resizing = {
                type: a ? "col" : "row",
                index: parseInt(a ? t.dataset.col : t.dataset.row),
                startPos: a ? e.pageX : e.pageY,
                startSize: a ? t.offsetWidth : t.parentElement.offsetHeight
            }, document.addEventListener("mousemove", handleResize), document.addEventListener("mouseup", endResize))
        }
    }

    function handleResize(e) {
        if (resizing) {
            const t = ("col" === resizing.type ? e.pageX : e.pageY) - resizing.startPos,
                a = resizing.startSize + t;
            "col" === resizing.type ? a > 50 && (appState.gridConfig.colWidths[resizing.index] = a) : a > 40 && (appState.gridConfig.rowHeights[resizing.index] = a), renderGrid()
        }
    }

    function endResize() {
        resizing && (resizing = null, document.removeEventListener("mousemove", handleResize), document.removeEventListener("mouseup", endResize), saveActiveSession())
    }
    let availState = {
        currentAttendee: null,
        availability: {},
        dates: []
    };

    function openAvailabilityModal(e) {
        availState.currentAttendee = appState.attendees.find(t => t.id === e), availState.currentAttendee && (document.getElementById("modal-attendee-name").textContent = availState.currentAttendee.name, availState.availability = JSON.parse(JSON.stringify(availState.currentAttendee.availability || {})), availState.dates = Object.keys(availState.availability).sort(), 0 === availState.dates.length && (e = (new Date).toISOString().split("T")[0], availState.dates.push(e), availState.availability[e] = Array(24).fill(!1)), renderAvailabilityGrid(), document.getElementById("availability-modal").classList.remove("hidden"))
    }

    function renderAvailabilityGrid() {
        let e = '<table class="planner-table"><thead><tr><th>Time</th>';
        availState.dates.forEach(t => {
            e += `<th>${formatDate(t)} <span class="remove-date-btn" data-date="${t}">&times;</span></th>`
        }), e += "</tr></thead><tbody>";
        for (let t = 0; t <= 23; t++) {
            e += `<tr><td class="time-header">${formatTime(t)}</td>`, availState.dates.forEach(a => {
                const n = t,
                    o = availState.availability[a]?.[n] || !1;
                e += `<td><div class="availability-slot ${o?"available":""}" data-date="${a}" data-hour="${n}"></div></td>`
            }), e += "</tr>"
        }
        e += "</tbody></table>", document.getElementById("availability-grid-container").innerHTML = e
    }

    function calculateHeatmapData() {
        const e = {},
            t = new Set;
        return appState.attendees.forEach(a => {
            for (const n in a.availability) t.add(n), e[n] || (e[n] = {}), a.availability[n].forEach((t, a) => {
                t && (e[n][a] = (e[n][a] || 0) + 1)
            })
        }), {
            counts: e,
            dates: Array.from(t).sort(),
            totalAttendees: appState.attendees.length
        }
    }

    function renderHeatmapGrid(e, t, a) {
        let n = '<table class="planner-table"><thead><tr><th>Time</th>';
        t.forEach(e => {
            n += `<th>${formatDate(e)}</th>`
        }), n += "</tr></thead><tbody>";
        for (let d = 0; d <= 23; d++) {
            const r = d;
            n += `<tr><td class="time-header">${formatTime(r)}</td>`, t.forEach(t => {
                const d = e[t]?.[r] || 0,
                    i = a > 0 ? d / a : 0;
                n += `<td class="heatmap-cell" style="background-color: rgba(34, 197, 94, ${i});" data-date="${t}" data-hour="${r}">${d}</td>`
            }), n += "</tr>"
        }
        n += "</tbody></table>", document.getElementById("heatmap-grid-container").innerHTML = n
    }

    function generateAndShowHeatmap() {
        const e = document.getElementById("heatmap-grid-container"),
            t = document.getElementById("heatmap-modal");
        if (!appState.attendees || 0 === appState.attendees.length) return e.innerHTML = '<p class="text-center text-gray-500">Please add attendees first.</p>', void t.classList.remove("hidden");
        const {
            counts: a,
            dates: n,
            totalAttendees: o
        } = calculateHeatmapData();
        if (0 === n.length) return e.innerHTML = '<p class="text-center text-gray-500">No availability data entered.</p>', void t.classList.remove("hidden");
        renderHeatmapGrid(a, n, o), t.classList.remove("hidden")
    }

    function showHeatmapTooltip(e, t) {
        const {
            date: a,
            hour: n
        } = e.dataset, o = parseInt(n), d = [], r = [];
        appState.attendees.forEach(e => {
            (e.availability[a]?.[o] ? d : r).push(e.name)
        });
        const i = document.createElement("div");
        i.id = "heatmap-tooltip", i.innerHTML = `<h4>Available (${d.length})</h4><ul>${d.map(e=>`<li>${e}</li>`).join("")||"<li>None</li>"}</ul><h4 class="mt-2">Unavailable (${r.length})</h4><ul>${r.map(e=>`<li>${e}</li>`).join("")||"<li>None</li>"}</ul>`, document.body.appendChild(i);
        const l = i.getBoundingClientRect(),
            s = t.pageX + 15 + l.width > window.innerWidth ? t.pageX - 15 - l.width : t.pageX + 15,
            c = t.pageY + 15 + l.height > window.innerHeight ? t.pageY - 15 - l.height : t.pageY + 15;
        i.style.left = `${s}px`, i.style.top = `${c}px`
    }

    function openMasterTaskEditor(e = null) {
        currentEditingMasterTaskId = e;
        const t = e !== null ? appState.masterTasks.find(t => t.id === e) : {};
        document.getElementById("master-task-title").value = t?.title || "", 
        document.getElementById("master-task-pics").innerHTML = appState.attendees.map(e => `<label class="flex items-center space-x-2"><input type="checkbox" value="${e.id}" ${(t?.picAttendeeIds||[]).includes(e.id)?"checked":""}><span>${e.name}</span></label>`).join("");
        const a = document.getElementById("master-task-tags");
        a.innerHTML = appState.tags.map(e => `<label class="flex items-center space-x-2"><input type="checkbox" value="${e.id}" ${(t?.requiredTagIds||[]).includes(e.id)?"checked":""}><span>${e.name}</span></label>`).join(""), masterTaskEditorModal.classList.remove("hidden")
    }

    function saveMasterTask() {
        const e = document.getElementById("master-task-title").value.trim();
        if (e) {
            const t = Array.from(document.querySelectorAll("#master-task-pics input:checked")).map(e => parseInt(e.value)),
                a = Array.from(document.querySelectorAll("#master-task-tags input:checked")).map(e => parseInt(e.value));
            if (null !== currentEditingMasterTaskId) {
                const n = appState.masterTasks.find(e => e.id === currentEditingMasterTaskId);
                n.title = e;
                n.picAttendeeIds = t;
                n.requiredTagIds = a;
            } else {
                appState.masterTasks.push({
                    id: appState.nextMasterTaskId++,
                    title: e,
                    picAttendeeIds: t,
                    requiredTagIds: a
                });
            }
            masterTaskEditorModal.classList.add("hidden"), renderMasterTasks(), saveActiveSession();
        }
    }

    function openTaskSuggestionModal() {
        taskSuggestionSelect.innerHTML = appState.masterTasks.map(e => `<option value="${e.id}">${e.title}</option>`).join(""), calculateAndShowSuggestions(), taskSuggestionModal.classList.remove("hidden")
    }

    function calculateAndShowSuggestions() {
        const e = parseInt(taskSuggestionSelect.value);
        if (isNaN(e)) return void(taskSuggestionResults.innerHTML = "<p>Please create a task first.</p>");
        const t = appState.masterTasks.find(t => t.id === e),
            a = new Set(t.picAttendeeIds || []);
        (t.requiredTagIds || []).forEach(tagId => {
            appState.attendees.forEach(attendee => {
                if((attendee.tags || []).includes(tagId)) a.add(attendee.id);
            });
        });
        const n = [...a];
        if (0 === n.length) return void(taskSuggestionResults.innerHTML = "<p>No attendees are assigned to this task's roles.</p>");
        const o = new Set;
        appState.attendees.forEach(e => Object.keys(e.availability || {}).forEach(e => o.add(e)));
        const d = [];
        o.forEach(e => {
            let t = -1,
                a = -1,
                o = [],
                r = [];
            for (let i = 0; i < 24; i++) {
                let d = [];
                n.forEach(t => {
                    const n = appState.attendees.find(e => e.id === t);
                    n?.availability?.[e]?.[i] && d.push(n.name)
                }), d.length > a && (a = d.length, t = i, o = d)
            } - 1 !== t && (r = n.map(e => appState.attendees.find(t => t.id === e).name).filter(e => !o.includes(e)), d.push({
                date: e,
                score: a / n.length * 100,
                bestHour: t,
                available: o,
                unavailable: r
            }))
        }), d.sort((e, t) => t.score - e.score), taskSuggestionResults.innerHTML = d.map(e => `
            <div class="suggestion-card">
                <h4 class="font-bold">${formatDate(e.date)} - ${e.score.toFixed(0)}% Match</h4>
                <p><strong>Best Time:</strong> ${formatTime(e.bestHour)} (${e.available.length}/${n.length} available)</p>
                <p><small><strong>Available:</strong> ${e.available.join(", ")|| "None"}</small></p>
                <p><small><strong>Unavailable:</strong> ${e.unavailable.join(", ")||"None"}</small></p>
            </div>
        `).join("")
    }

    function init() {
        loadSessionBtn.addEventListener('click', () => { if(sessionSelect.value) loadSession(sessionSelect.value); sessionModal.classList.add('hidden'); });
        newSessionBtn.addEventListener('click', () => { const newName = prompt("Enter name for the new session:", "New Session " + new Date().toLocaleDateString()); if (newName) { loadSession(newName); saveActiveSession(); } sessionModal.classList.add('hidden'); });
        saveSessionBtn.addEventListener('click', () => { const newName = sessionNameInput.value.trim(); if (newName && newName !== activeSessionName) { activeSessionName = newName; } saveActiveSession(); alert(`Session '${activeSessionName}' saved!`); });
        deleteSessionBtn.addEventListener('click', () => { if (confirm(`Are you sure you want to delete session '${activeSessionName}'?`)) { deleteActiveSession(); }});
        importFromLinkBtn.addEventListener('click', () => { const url = prompt("Please enter the When2Meet event URL:"); if (url) { try { new URL(url); w2mLink.href = url; importLinkModal.classList.remove('hidden'); } catch(_) { alert("Invalid URL format."); } } });
        closeImportLinkModalBtn.addEventListener('click', () => importLinkModal.classList.add('hidden'));
        copyScriptBtn.addEventListener('click', () => { navigator.clipboard.writeText(w2mScraperScript).then(() => { copyScriptBtn.textContent = 'Copied!'; setTimeout(() => copyScriptBtn.innerHTML = '<u>Click here to copy the import script</u>', 2000); }); });
        csvFileInput.addEventListener('change', handleCSVImport);
        addAttendeeBtn.addEventListener('click', () => addAttendee());
        addRowBtn.addEventListener('click', addGridRow);
        addColBtn.addEventListener('click', addGridColumn);
        removeRowBtn.addEventListener('click', removeGridRow);
        removeColBtn.addEventListener('click', removeGridColumn);
        addTagBtn.addEventListener('click', addTag);
        saveTagsBtn.addEventListener('click', saveTags);
        tagsList.addEventListener('click', e => { const tagEl = e.target.closest('.sidebar-tag'); if (tagEl) toggleTagFilter(parseInt(tagEl.dataset.tagId)); });
        attendeesList.addEventListener('click', e => { const target = e.target; const id = parseInt(target.dataset.id); if (target.classList.contains('remove-attendee-btn')) { appState.attendees = appState.attendees.filter(a => a.id !== id); renderAll(); saveActiveSession(); } if (target.classList.contains('set-availability-btn')) { openAvailabilityModal(id); } });
        mainContent.addEventListener('click', e => { if (e.target.classList.contains('assign-tags-btn')) { openTagsModal(e.target.closest('.placed-attendee')); } else { const cell = e.target.closest('td'); if (cell && !e.target.closest('.attendee-block')) { openCellEditorModal(cell); } } });
        closeCellEditorBtn.addEventListener('click', () => cellEditorModal.classList.add('hidden'));
        saveCellBtn.addEventListener('click', saveCellChanges);
        attendeesList.addEventListener('dragstart', handleDragStart);
        tagsList.addEventListener('dragstart', handleDragStart);
        masterTasksList.addEventListener('dragstart', handleDragStart);
        mainContent.addEventListener('dragstart', handleDragStart);
        mainContent.addEventListener('dragover', e => e.preventDefault());
        mainContent.addEventListener('drop', handleDrop);
        mainContent.addEventListener('dragend', () => renderGrid());
        mainContent.addEventListener('mousedown', startResize);
        scheduleTable.addEventListener('mousedown', handleSelection);
        mergeCellsBtn.addEventListener('click', mergeSelectedCells);
        toolbarFontSize.addEventListener('change', (e) => applyStyleToSelectedCells('fontSize', e.target.value));
        toolbarTextColor.addEventListener('input', (e) => applyStyleToSelectedCells('textColor', e.target.value));
        toolbarBgColor.addEventListener('input', (e) => applyStyleToSelectedCells('bgColor', e.target.value));
        mainToolbar.addEventListener('click', e => { if (e.target.classList.contains('toolbar-format-btn')) { mainToolbar.querySelectorAll('.toolbar-format-btn').forEach(btn => btn.classList.remove('active')); e.target.classList.add('active'); applyStyleToSelectedCells('textAlign', e.target.dataset.align); } });
        deleteBin.addEventListener('dragover', e => { e.preventDefault(); deleteBin.classList.add('drag-over'); });
        deleteBin.addEventListener('dragleave', () => deleteBin.classList.remove('drag-over'));
        deleteBin.addEventListener('drop', e => { 
            deleteBin.classList.remove('drag-over'); 
            const data = JSON.parse(e.dataTransfer.getData('application/json')); 
            if (data.type === 'attendee') { 
                if (data.sourceKey) { 
                    const cellData = appState.gridContent[data.sourceKey]; 
                    if (cellData && cellData.attendees) { 
                        cellData.attendees = cellData.attendees.filter(att => att.id !== data.id); 
                    } 
                } else { 
                    appState.attendees = appState.attendees.filter(a => a.id !== data.id); 
                    Object.values(appState.gridContent).forEach(cell => { 
                        if (cell.attendees) { 
                            cell.attendees = cell.attendees.filter(att => att.id !== data.id); 
                        } 
                    }); 
                } 
            } else if (data.type === 'tag') { 
                appState.tags = appState.tags.filter(t => t.id !== data.id); 
                Object.values(appState.gridContent).forEach(cell => { 
                    if (cell.attendees) { 
                        cell.attendees.forEach(att => { 
                            if (att.tags) att.tags = att.tags.filter(tid => tid !== data.id); 
                        }); 
                    } 
                }); 
            } else if(data.type === 'master-task'){
                appState.masterTasks = appState.masterTasks.filter(t => t.id !== data.id);
                Object.values(appState.gridContent).forEach(cell => {
                    if(cell.tasks) cell.tasks = cell.tasks.filter(tid => tid !== data.id);
                });
            }
            renderAll(); 
            saveActiveSession(); 
        });
        const sessionKeys = loadSessionList();
        if (sessionKeys.length > 0) { sessionModal.classList.remove('hidden'); } else { sessionModal.classList.add('hidden'); loadSession('My First Session'); }
        const availabilityModal = document.getElementById('availability-modal');
        const closeModalBtn = document.getElementById('close-modal-btn');
        const addDateBtn = document.getElementById('add-date-btn');
        const availabilityDatePicker = document.getElementById('availability-date-picker');
        const availabilityGridContainer = document.getElementById('availability-grid-container');
        closeModalBtn.addEventListener('click', () => { if (availState.currentAttendee) { availState.currentAttendee.availability = availState.availability; saveActiveSession(); } availabilityModal.classList.add('hidden'); });
        addDateBtn.addEventListener('click', () => { if (availabilityDatePicker.value && !availState.dates.includes(availabilityDatePicker.value)) { availState.dates.push(availabilityDatePicker.value); availState.dates.sort(); availState.availability[availabilityDatePicker.value] = Array(24).fill(false); renderAvailabilityGrid(); } });
        availabilityGridContainer.addEventListener('click', e => { if (e.target.classList.contains('availability-slot')) { const { date, hour } = e.target.dataset; availState.availability[date][hour] = !availState.availability[date][hour]; renderAvailabilityGrid(); } if (e.target.classList.contains('remove-date-btn')) { const date = e.target.dataset.date; availState.dates = availState.dates.filter(d => d !== date); delete availState.availability[date]; renderAvailabilityGrid(); } });
        viewHeatmapBtn.addEventListener('click', generateAndShowHeatmap);
        const heatmapModal = document.getElementById('heatmap-modal');
        const closeHeatmapBtn = document.getElementById('close-heatmap-btn');
        const heatmapGridContainer = document.getElementById('heatmap-grid-container');
        closeHeatmapBtn.addEventListener('click', () => heatmapModal.classList.add('hidden'));
        heatmapGridContainer.addEventListener('mouseover', e => { if (e.target.classList.contains('heatmap-cell')) showHeatmapTooltip(e.target, e); });
        heatmapGridContainer.addEventListener('mouseout', () => document.getElementById('heatmap-tooltip')?.remove());
        mainContent.addEventListener('mouseover', e => { const cell = e.target.closest('td'); if (cell && !document.getElementById('suggestion-popover')) { showSuggestionPopover(cell); }});
        mainContent.addEventListener('mouseout', e => { const cell = e.target.closest('td'); if(cell){ hideSuggestionPopover(); }});

        addMasterTaskBtn.addEventListener('click', () => openMasterTaskEditor());
        closeMasterTaskEditorBtn.addEventListener('click', () => masterTaskEditorModal.classList.add('hidden'));
        saveMasterTaskBtn.addEventListener('click', saveMasterTask);
        masterTasksList.addEventListener('click', e => { if (e.target.classList.contains('edit-master-task-btn')) { openMasterTaskEditor(parseInt(e.target.dataset.taskId)); } });
        suggestTaskDateBtn.addEventListener('click', openTaskSuggestionModal);
        closeTaskSuggestionBtn.addEventListener('click', () => taskSuggestionModal.classList.add('hidden'));
        taskSuggestionSelect.addEventListener('change', calculateAndShowSuggestions);

         document.getElementById('sidebar').addEventListener('dragover', e => {
            e.preventDefault();
            document.getElementById('sidebar').classList.add('drag-over');
        });
        document.getElementById('sidebar').addEventListener('dragleave', () => {
             document.getElementById('sidebar').classList.remove('drag-over');
        });
        document.getElementById('sidebar').addEventListener('drop', e => {
             document.getElementById('sidebar').classList.remove('drag-over');
             handleDrop(e);
        });
        menuToggleBtn.addEventListener('click', () => sidebar.classList.toggle('sidebar-open'));

        document.querySelectorAll('.accordion-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const item = header.parentElement;
                if(item.hasAttribute('open')) {
                    // This is to allow the default closing behavior
                } else {
                    // This is to allow the default opening behavior
                }
            });
        });

        lucide.createIcons();
    }
    
    // --- Full function bodies for brevity and completeness ---
    // (These functions are unchanged but provided here to make the script whole)
    const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
    const formatTime = (hour) => {
        const h = parseInt(hour); if (h === 0) return '12 AM'; if (h === 12) return '12 PM';
        if (h < 12) return `${h} AM`; return `${h - 12} PM`;
    };
    const getRandomColor = (alpha = 1) => `hsla(${Math.random() * 360}, 70%, 50%, ${alpha})`;

    init();
});

