// State management
const state = {
    tasks: JSON.parse(localStorage.getItem('zen_tasks') || '[]'),
    isSelectionMode: false,
    isSubtaskMode: false,
    isExecuteMode: false,
    isViewingSubtasks: false,
    selectedTasks: new Set(),
    selectedTasksForSubtasks: [],
    currentTimer: null,
    currentSubtask: null,
    pauseUsed: false,
    resetUsed: false,
    limits: {
        leverage: 3,
        neutral: 2,
        overhead: 1
    }
};

// DOM Elements
const taskInput = document.getElementById('taskInput');
const labelSelect = document.getElementById('labelSelect');
const timeSelect = document.getElementById('timeSelect');
const addTaskBtn = document.getElementById('addTask');
const taskList = document.querySelector('.task-list');
const nextBtn = document.getElementById('nextBtn');
const backBtn = document.getElementById('backBtn');
const screenTitle = document.getElementById('screenTitle');
const taskInputContainer = document.querySelector('.task-input-container');
const taskInputTrigger = document.querySelector('.task-input-trigger');
const taskInputFields = document.querySelector('.task-input-fields');
const labelTrigger = document.getElementById('labelTrigger');
const labelDropdown = document.getElementById('labelDropdown');
const toastContainer = document.getElementById('toastContainer');
const editTimeTemplate = document.getElementById('editTimeTemplate');
const editLabelTemplate = document.getElementById('editLabelTemplate');
const subtaskModal = document.getElementById('subtaskModal');
const modalTitle = document.getElementById('modalTitle');
const modalTime = document.getElementById('modalTime');
const subtaskList = document.getElementById('subtaskList');
const saveSubtasksBtn = document.getElementById('saveSubtasks');
const subtaskTemplate = document.getElementById('subtaskTemplate');
const addNewSubtaskBtn = document.getElementById('addNewSubtask');

// Additional DOM Elements
const modePill = document.querySelector('.mode-pill');
const planMode = document.querySelector('.plan-mode');
const executeMode = document.querySelector('.execute-mode');
const taskPanel = document.querySelector('.task-panel');
const pickTaskBtn = document.querySelector('.pick-task-btn');
const closeTaskPanelBtn = document.querySelector('.close-panel-btn');
const subtaskListExecute = document.querySelector('.subtask-list-execute');
const executeTitle = document.querySelector('.execute-title');
const doneCriteriaDisplay = document.querySelector('.done-criteria-display');
const timer = document.querySelector('.timer');
const playPauseBtn = document.querySelector('.play-pause-btn');
const resetBtn = document.querySelector('.reset-btn');
const listViewBtn = document.querySelector('.list-view-btn');
const finishBtn = document.querySelector('.finish-btn');
const completionModal = document.getElementById('completionModal');
const completionTaskTitle = document.getElementById('completionTaskTitle');
const completionDoneCriteria = document.getElementById('completionDoneCriteria');
const completionNotes = document.getElementById('completionNotes');
const noBtn = document.querySelector('.no-btn');
const yesBtn = document.querySelector('.yes-btn');
const modePillDropdown = document.querySelector('.mode-pill-dropdown');
const currentMode = document.querySelector('.current-mode');
const modeOptions = document.querySelector('.mode-options');
const emptyState = document.querySelector('.empty-state');
const switchModeBtn = document.querySelector('.switch-mode-btn');

let currentTaskId = null;

// Timer functionality
let timerInterval;
let remainingSeconds = 0;
let isPaused = true;

function formatTimeDisplay(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function startTimer() {
    if (state.pauseUsed && !isPaused) {
        showToast("You've used up all Pauses for this task");
        return;
    }
    
    isPaused = false;
    playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    
    timerInterval = setInterval(() => {
        if (remainingSeconds > 0) {
            remainingSeconds--;
            timer.textContent = formatTimeDisplay(remainingSeconds);
        } else {
            clearInterval(timerInterval);
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            isPaused = true;
            showCompletionModal();
        }
    }, 1000);
}

function pauseTimer() {
    if (state.pauseUsed) {
        showToast("You've used up all Pauses for this task");
        return;
    }
    
    isPaused = true;
    state.pauseUsed = true;
    playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    playPauseBtn.classList.add('disabled');
    clearInterval(timerInterval);
}

function resetTimer() {
    if (state.resetUsed) {
        showToast("You've used up all Resets for this task");
        return;
    }
    
    clearInterval(timerInterval);
    timer.textContent = formatTimeDisplay(state.currentTimer);
    remainingSeconds = state.currentTimer;
    isPaused = true;
    playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    
    state.resetUsed = true;
    resetBtn.classList.add('disabled');
}

function toggleTimer() {
    if (isPaused) {
        startTimer();
    } else {
        pauseTimer();
    }
}

// Save state to localStorage
function saveState() {
    localStorage.setItem('zen_tasks', JSON.stringify(state.tasks));
    updateNextButtonState();
}

// Update Next button state
function updateNextButtonState() {
    nextBtn.disabled = state.tasks.length === 0;
}

// Update Add button state
function updateAddButtonState() {
    const title = taskInput.value.trim();
    const label = labelSelect.value;
    const time = timeSelect.value;
    
    addTaskBtn.disabled = !title || !label || !time;
}

// Format time
function formatTime(minutes) {
    return minutes >= 60 
        ? `${Math.floor(minutes/60)}h${minutes % 60 ? ' ' + (minutes % 60) + 'm' : ''}`
        : `${minutes}m`;
}

// Check if type limit is reached
function isTypeLimitReached(type) {
    const counts = getSelectedTaskCounts();
    return counts[type] >= state.limits[type];
}

// Show toast message
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    
    // Remove toast after animation
    toast.addEventListener('animationend', () => {
        toast.remove();
    });
}

// Count selected tasks by type
function getSelectedTaskCounts() {
    const counts = { leverage: 0, neutral: 0, overhead: 0 };
    state.selectedTasks.forEach(taskId => {
        const task = state.tasks.find(t => t.id === taskId);
        if (task) {
            counts[task.label]++;
        }
    });
    return counts;
}

// Check if selection is allowed
function canSelectTask(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return false;
    
    if (state.selectedTasks.has(taskId)) return true; // Always allow deselection
    
    // Check if adding this task would exceed limits
    if (isTypeLimitReached(task.label)) {
        showToast(`You can only select up to ${state.limits[task.label]} ${task.label} tasks`);
        return false;
    }
    
    return true;
}

// Toggle task selection
function toggleTaskSelection(taskId, checkbox) {
    if (!canSelectTask(taskId)) {
        checkbox.checked = false;
        return;
    }
    
    if (state.selectedTasks.has(taskId)) {
        state.selectedTasks.delete(taskId);
        checkbox.classList.remove('checked');
    } else {
        state.selectedTasks.add(taskId);
        checkbox.classList.add('checked');
    }
    
    // Update disabled state for all tasks
    renderTasks();
}

// Handle disabled task click
function handleDisabledTaskClick(task) {
    showToast(`You can only select up to ${state.limits[task.label]} ${task.label} tasks`);
}

// Create task element
function createTaskElement(task) {
    const taskElement = document.createElement('div');
    const isDisabled = state.isSelectionMode && 
                      !state.selectedTasks.has(task.id) && 
                      isTypeLimitReached(task.label);
    
    taskElement.className = `task-item${state.isSelectionMode ? ' selection-mode' : ''}${isDisabled ? ' disabled' : ''}${state.isSubtaskMode ? ' subtask-mode' : ''}`;
    
    if (isDisabled) {
        taskElement.onclick = () => handleDisabledTaskClick(task);
    }
    
    // Create header
    const header = document.createElement('div');
    header.className = 'task-item-header';
    
    const label = document.createElement('div');
    label.className = `task-label ${task.label}`;
    label.textContent = task.label.charAt(0).toUpperCase();
    
    const title = document.createElement('span');
    title.className = 'task-title';
    title.contentEditable = !state.isSelectionMode;
    title.textContent = task.title;
    title.onblur = () => {
        if (!state.isSelectionMode) {
            task.title = title.textContent;
            saveState();
        }
    };
    
    const time = document.createElement('span');
    time.className = 'task-time';
    time.textContent = formatTime(task.time);
    time.onclick = () => !state.isSelectionMode && startEditingTime(task.id, time);
    
    header.appendChild(label);
    header.appendChild(title);
    header.appendChild(time);
    
    // Create content
    const content = document.createElement('div');
    content.className = 'task-item-content';
    
    if (state.isSubtaskMode) {
        if (task.subtasks?.length) {
            const subtaskInfo = document.createElement('div');
            subtaskInfo.className = 'subtask-info';
            const viewSubtasksBtn = document.createElement('button');
            viewSubtasksBtn.className = 'add-subtask-btn';
            viewSubtasksBtn.textContent = `${task.subtasks.length} added`;
            viewSubtasksBtn.onclick = () => openSubtaskModal(task, true);
            subtaskInfo.appendChild(viewSubtasksBtn);
            content.appendChild(subtaskInfo);
            
            // Add subtask list preview
            const subtaskListPreview = document.createElement('div');
            subtaskListPreview.className = 'subtask-list-preview';
            
            task.subtasks.forEach(subtask => {
                const subtaskItem = document.createElement('div');
                subtaskItem.className = 'subtask-preview-item';
                
                const subtaskTitle = document.createElement('span');
                subtaskTitle.textContent = subtask.title;
                
                const subtaskTime = document.createElement('span');
                subtaskTime.className = 'subtask-preview-time';
                subtaskTime.textContent = formatTime(subtask.time);
                
                subtaskItem.appendChild(subtaskTitle);
                subtaskItem.appendChild(subtaskTime);
                subtaskListPreview.appendChild(subtaskItem);
            });
            
            content.appendChild(subtaskListPreview);
        } else {
            const addSubtaskBtn = document.createElement('button');
            addSubtaskBtn.className = 'add-subtask-btn';
            addSubtaskBtn.textContent = '+ Add subtasks';
            addSubtaskBtn.onclick = () => openSubtaskModal(task, false);
            content.appendChild(addSubtaskBtn);
        }
    } else {
        const checkbox = document.createElement('div');
        checkbox.className = `task-checkbox${state.selectedTasks.has(task.id) ? ' checked' : ''}${isDisabled ? ' disabled' : ''}`;
        if (!isDisabled) {
            checkbox.onclick = (e) => {
                e.stopPropagation();
                toggleTaskSelection(task.id, checkbox);
            };
        }
        header.appendChild(checkbox);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.onclick = () => {
            state.tasks = state.tasks.filter(t => t.id !== task.id);
            saveState();
            renderTasks();
        };
        header.appendChild(deleteBtn);
    }
    
    taskElement.appendChild(header);
    taskElement.appendChild(content);
    
    return taskElement;
}

// Start editing label
function startEditingLabel(taskId, labelElement) {
    const editSelect = editLabelTemplate.content.cloneNode(true).querySelector('.custom-select');
    const options = editSelect.querySelectorAll('.select-option');
    
    options.forEach(option => {
        option.onclick = () => {
            const task = state.tasks.find(t => t.id === taskId);
            task.label = option.dataset.value;
            saveState();
            renderTasks();
        };
    });
    
    const clickOutsideHandler = (e) => {
        if (!editSelect.contains(e.target)) {
            renderTasks();
            document.removeEventListener('click', clickOutsideHandler);
        }
    };
    
    setTimeout(() => {
        document.addEventListener('click', clickOutsideHandler);
    }, 0);
    
    labelElement.replaceWith(editSelect);
}

// Start editing time
function startEditingTime(taskId, timeElement) {
    const select = editTimeTemplate.content.cloneNode(true).querySelector('select');
    const task = state.tasks.find(t => t.id === taskId);
    select.value = task.time;
    
    select.onchange = () => {
        task.time = parseInt(select.value);
        saveState();
        renderTasks();
    };
    
    select.onblur = () => {
        renderTasks();
    };
    
    timeElement.replaceWith(select);
    select.focus();
}

// Render all tasks
function renderTasks() {
    taskList.innerHTML = '';
    
    // In subtask mode, only show selected tasks
    const tasksToRender = state.isSubtaskMode 
        ? state.selectedTasksForSubtasks 
        : state.tasks;
    
    tasksToRender.forEach(task => {
        taskList.appendChild(createTaskElement(task));
    });
    updateNextButtonState();
}

// Show input form
function showInputForm() {
    taskInputContainer.classList.remove('collapsed');
    taskInputTrigger.style.display = 'none';
    taskInputFields.style.display = 'block';
    taskInput.focus();
    updateAddButtonState();
}

// Hide input form
function hideInputForm() {
    if (!taskInput.value.trim() && !labelSelect.value && !timeSelect.value) {
        taskInputContainer.classList.add('collapsed');
        taskInputTrigger.style.display = 'flex';
        taskInputFields.style.display = 'none';
    }
}

// Add new task
function addTask() {
    const title = taskInput.value.trim();
    const label = labelSelect.value;
    const time = parseInt(timeSelect.value);
    
    if (!title || !label || !time) {
        alert('Please fill in all fields');
        return;
    }
    
    const task = {
        id: Date.now(),
        title,
        label,
        time
    };
    
    state.tasks.unshift(task);
    saveState();
    renderTasks();
    
    // Reset form
    taskInput.value = '';
    labelSelect.selectedIndex = 0;
    timeSelect.selectedIndex = 0;
    labelTrigger.querySelector('span').textContent = 'Label';
    updateAddButtonState();
    hideInputForm();
}

// Event Listeners
addTaskBtn.addEventListener('click', addTask);

taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTask();
    }
});

taskInput.addEventListener('input', updateAddButtonState);
timeSelect.addEventListener('change', updateAddButtonState);

// Progressive disclosure
taskInputTrigger.addEventListener('click', showInputForm);

// Close input container when clicking outside
document.addEventListener('click', (e) => {
    if (!taskInputContainer.contains(e.target)) {
        hideInputForm();
    }
});

// Handle custom select
function setupCustomSelect() {
    // Toggle dropdown
    labelTrigger.onclick = (e) => {
        e.stopPropagation();
        labelDropdown.classList.toggle('show');
    };

    // Handle option selection
    const options = labelDropdown.querySelectorAll('.select-option');
    options.forEach(option => {
        option.onclick = () => {
            const value = option.dataset.value;
            labelSelect.value = value;
            labelTrigger.querySelector('span').textContent = option.querySelector('span').textContent;
            labelDropdown.classList.remove('show');
            updateAddButtonState();
        };
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        labelDropdown.classList.remove('show');
    });

    // Prevent dropdown from closing when clicking inside
    labelDropdown.onclick = (e) => {
        e.stopPropagation();
    };
}

// Initialize custom select
setupCustomSelect();

// Enter selection mode
function enterSelectionMode() {
    state.isSelectionMode = true;
    state.selectedTasks.clear();
    screenTitle.textContent = 'Select tasks for next week';
    nextBtn.textContent = 'Done';
    backBtn.classList.add('show');
    taskInputContainer.style.display = 'none';
    renderTasks();
}

// Exit selection mode
function exitSelectionMode() {
    state.isSelectionMode = false;
    state.selectedTasks.clear();
    state.selectedTasksForSubtasks = []; // Clear stored tasks
    screenTitle.textContent = 'Add your main tasks';
    nextBtn.textContent = 'Next';
    backBtn.classList.remove('show');
    taskInputContainer.style.display = 'block';
    renderTasks();
}

// Event Listeners
nextBtn.addEventListener('click', () => {
    if (!state.isSelectionMode && !state.isSubtaskMode && !state.isExecuteMode) {
        enterSelectionMode();
    } else if (state.isSelectionMode) {
        enterSubtaskMode();
    } else if (state.isSubtaskMode) {
        enterExecuteMode();
    }
});

backBtn.addEventListener('click', () => {
    if (state.isExecuteMode) {
        state.isExecuteMode = false;
        state.isSubtaskMode = true;
        modePill.textContent = 'Plan mode';
        modePill.classList.remove('execute');
        planMode.style.display = 'flex';
        executeMode.style.display = 'none';
        clearInterval(timerInterval);
    } else if (state.isSubtaskMode) {
        exitSubtaskMode();
    } else if (state.isSelectionMode) {
        exitSelectionMode();
    }
});

// Open subtask modal
function openSubtaskModal(task, isViewing = false) {
    currentTaskId = task.id;
    modalTitle.textContent = task.title;
    modalTime.textContent = formatTime(task.time);
    state.isViewingSubtasks = isViewing;
    
    // Clear existing subtasks
    subtaskList.innerHTML = '';
    
    if (isViewing) {
        // Show existing subtasks in view mode
        task.subtasks.forEach(subtask => {
            addSubtaskToModal(subtask.time, subtask);
        });
        
        // Update modal for viewing mode
        saveSubtasksBtn.textContent = 'Exit';
        addNewSubtaskBtn.style.display = 'none';
        
        // Make all inputs readonly
        subtaskList.querySelectorAll('input').forEach(input => {
            input.readOnly = true;
        });
        
        // Hide all Add buttons
        subtaskList.querySelectorAll('.add-subtask-card-btn').forEach(btn => {
            btn.style.display = 'none';
        });
        
        // Show all details
        subtaskList.querySelectorAll('.subtask-item').forEach(item => {
            item.classList.remove('collapsed');
        });
        
        // Disable time steppers
        subtaskList.querySelectorAll('.time-stepper-btn').forEach(btn => {
            btn.style.display = 'none';
        });
    } else {
        // Add two default subtasks for editing mode
        addSubtaskToModal(task.time / 2);
        addSubtaskToModal(task.time / 2);
        
        // Expand first subtask
        const firstSubtask = subtaskList.querySelector('.subtask-item');
        if (firstSubtask) {
            expandSubtask(firstSubtask);
        }
        
        // Reset modal for editing mode
        saveSubtasksBtn.textContent = 'Save';
        addNewSubtaskBtn.style.display = 'block';
        saveSubtasksBtn.disabled = true;
    }
    
    subtaskModal.classList.add('show');
    if (!isViewing) {
        validateSubtasks();
    }
}

// Add subtask to modal
function addSubtaskToModal(defaultTime, existingSubtask = null) {
    const subtaskElement = subtaskTemplate.content.cloneNode(true);
    const subtaskItem = subtaskElement.querySelector('.subtask-item');
    const titleInput = subtaskElement.querySelector('.subtask-title');
    const timeInput = subtaskElement.querySelector('.subtask-time');
    const quantityInput = subtaskElement.querySelector('.quantity-input');
    const deliverableInput = subtaskElement.querySelector('.deliverable-input');
    const actionInput = subtaskElement.querySelector('.action-input');
    const qualityInput = subtaskElement.querySelector('.quality-input');
    
    if (existingSubtask) {
        // Fill in existing subtask data
        titleInput.value = existingSubtask.title;
        timeInput.value = existingSubtask.time;
        quantityInput.value = existingSubtask.doneCriteria.quantity;
        deliverableInput.value = existingSubtask.doneCriteria.deliverable;
        actionInput.value = existingSubtask.doneCriteria.action;
        qualityInput.value = existingSubtask.doneCriteria.quality;
    } else {
        timeInput.value = defaultTime;
        
        const addBtn = subtaskElement.querySelector('.add-subtask-card-btn');
        const minusBtn = subtaskElement.querySelector('.time-stepper-btn.minus');
        const plusBtn = subtaskElement.querySelector('.time-stepper-btn.plus');
        
        // Handle time stepper
        minusBtn.onclick = () => updateTime(timeInput, -15);
        plusBtn.onclick = () => updateTime(timeInput, 15);
        
        // Handle expand/collapse
        titleInput.addEventListener('focus', () => expandSubtask(subtaskItem));
        
        // Handle add button
        addBtn.addEventListener('click', () => {
            subtaskItem.classList.add('collapsed');
            validateSubtasks();
        });
        
        // Handle click outside
        document.addEventListener('click', (e) => {
            if (!subtaskItem.contains(e.target)) {
                subtaskItem.classList.add('collapsed');
            }
        });
        
        // Handle input changes
        subtaskItem.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', validateSubtasks);
        });
    }
    
    subtaskList.appendChild(subtaskItem);
}

// Update time with stepper
function updateTime(input, change) {
    let value = parseInt(input.value) || 15;
    value = Math.max(15, value + change);
    input.value = value;
    validateSubtasks();
}

// Expand subtask and collapse others
function expandSubtask(subtaskItem) {
    // Collapse all other subtasks
    subtaskList.querySelectorAll('.subtask-item').forEach(item => {
        if (item !== subtaskItem) {
            item.classList.add('collapsed');
        }
    });
    
    // Expand this subtask
    subtaskItem.classList.remove('collapsed');
    
    // Focus title input if empty
    const titleInput = subtaskItem.querySelector('.subtask-title');
    if (!titleInput.value) {
        titleInput.focus();
    }
}

// Validate subtasks and update save button state
function validateSubtasks() {
    const subtasks = subtaskList.querySelectorAll('.subtask-item');
    let validCount = 0;
    let totalTime = 0;
    
    subtasks.forEach(subtask => {
        const title = subtask.querySelector('.subtask-title').value.trim();
        const time = parseInt(subtask.querySelector('.subtask-time').value) || 0;
        const quantity = subtask.querySelector('.quantity-input').value.trim();
        const deliverable = subtask.querySelector('.deliverable-input').value.trim();
        const action = subtask.querySelector('.action-input').value.trim();
        const quality = subtask.querySelector('.quality-input').value.trim();
        
        if (title && time && quantity && deliverable && action && quality) {
            validCount++;
        }
        
        totalTime += time;
    });
    
    const task = state.tasks.find(t => t.id === currentTaskId);
    const isTimeValid = task && totalTime <= task.time;
    
    saveSubtasksBtn.disabled = validCount < 2 || !isTimeValid;
    
    if (!isTimeValid) {
        showToast(`Time for all subtasks must stay within the main task's limit of ${formatTime(task.time)}`);
    }
}

// Add new subtask button handler
addNewSubtaskBtn.addEventListener('click', () => {
    const task = state.tasks.find(t => t.id === currentTaskId);
    if (task) {
        addSubtaskToModal(15);
        const newSubtask = subtaskList.lastElementChild;
        expandSubtask(newSubtask);
    }
});

// Save subtasks
function saveSubtasks() {
    console.log('Starting save subtasks...');
    const task = state.tasks.find(t => t.id === currentTaskId);
    if (!task) {
        console.error('No task found with ID:', currentTaskId);
        return;
    }
    
    const subtasks = [];
    let totalTime = 0;
    
    subtaskList.querySelectorAll('.subtask-item').forEach(item => {
        const title = item.querySelector('.subtask-title').value.trim();
        const time = parseInt(item.querySelector('.subtask-time').value);
        const quantity = item.querySelector('.quantity-input').value.trim();
        const deliverable = item.querySelector('.deliverable-input').value.trim();
        const action = item.querySelector('.action-input').value.trim();
        const quality = item.querySelector('.quality-input').value.trim();
        
        if (title && time && quantity && deliverable && action && quality) {
            subtasks.push({
                id: Date.now() + Math.random(),
                title,
                time,
                doneCriteria: {
                    quantity: parseInt(quantity),
                    deliverable,
                    action,
                    quality
                }
            });
            totalTime += time;
        }
    });
    
    console.log('Collected subtasks:', subtasks);
    console.log('Total time:', totalTime, 'Task time limit:', task.time);
    
    if (totalTime > task.time) {
        showToast(`Time for all subtasks must stay within the main task's limit of ${formatTime(task.time)}`);
        return;
    }
    
    task.subtasks = subtasks;
    saveState();
    console.log('State saved, task updated with subtasks');
    
    renderTasks();
    console.log('Tasks re-rendered');
    
    closeSubtaskModal();
    console.log('Modal should be closed');
}

// Close subtask modal
function closeSubtaskModal() {
    console.log('Closing modal...');
    subtaskModal.classList.remove('show');
    currentTaskId = null;
    state.isViewingSubtasks = false;
    console.log('Modal closed, state reset');
}

// Handle modal action
function handleModalAction() {
    console.log('Modal action triggered, viewing mode:', state.isViewingSubtasks);
    if (state.isViewingSubtasks) {
        closeSubtaskModal();
    } else {
        saveSubtasks();
    }
}

// Update event listener for save/exit button
saveSubtasksBtn.removeEventListener('click', handleModalAction); // Remove any existing listeners
saveSubtasksBtn.addEventListener('click', handleModalAction);

// Close modal when clicking outside
subtaskModal.addEventListener('click', (e) => {
    if (e.target === subtaskModal) {
        if (state.isViewingSubtasks) {
            closeSubtaskModal();
        }
    }
});

// Enter subtask mode
function enterSubtaskMode() {
    // Store selected tasks before entering subtask mode
    state.selectedTasksForSubtasks = state.tasks.filter(task => 
        state.selectedTasks.has(task.id)
    );
    
    state.isSubtaskMode = true;
    state.isSelectionMode = false;
    screenTitle.textContent = 'Break these into subtasks';
    nextBtn.textContent = 'Next';
    backBtn.classList.add('show');
    taskInputContainer.style.display = 'none';
    renderTasks();
}

// Exit subtask mode
function exitSubtaskMode() {
    state.isSubtaskMode = false;
    state.selectedTasksForSubtasks = []; // Clear stored tasks
    screenTitle.textContent = 'Add your main tasks';
    nextBtn.textContent = 'Next';
    backBtn.classList.remove('show');
    taskInputContainer.style.display = 'block';
    renderTasks();
}

// Enter execute mode
function enterExecuteMode() {
    if (state.tasks.length === 0) {
        showEmptyState();
        return;
    }

    state.isExecuteMode = true;
    state.isSubtaskMode = false;
    modePill.classList.add('execute');
    planMode.style.display = 'none';
    executeMode.style.display = 'flex';
    hideEmptyState();
    
    // Reset execute mode state
    executeTitle.textContent = 'Pick a task to begin';
    doneCriteriaDisplay.style.display = 'none';
    timer.textContent = '00:00';
    timer.classList.remove('active');
    playPauseBtn.disabled = true;
    resetBtn.disabled = true;
    
    // Reset CTAs
    pickTaskBtn.style.display = 'block';
    finishBtn.style.display = 'none';
    
    renderExecuteTaskList();
}

// Render execute task list
function renderExecuteTaskList() {
    subtaskListExecute.innerHTML = '';
    
    state.selectedTasksForSubtasks.forEach(task => {
        if (task.subtasks) {
            task.subtasks.forEach(subtask => {
                const subtaskElement = document.createElement('div');
                subtaskElement.className = 'subtask-execute-item';
                subtaskElement.dataset.subtaskId = subtask.id;
                
                const header = document.createElement('div');
                header.className = 'subtask-execute-header';
                
                const title = document.createElement('div');
                title.className = 'subtask-execute-title';
                title.textContent = subtask.title;
                
                const time = document.createElement('div');
                time.className = 'subtask-execute-time';
                time.textContent = formatTime(subtask.time);
                
                const beginBtn = document.createElement('button');
                beginBtn.className = 'begin-task-btn';
                beginBtn.textContent = 'Begin';
                beginBtn.onclick = () => beginTask(task, subtask);
                
                header.appendChild(title);
                header.appendChild(time);
                
                subtaskElement.appendChild(header);
                subtaskElement.appendChild(beginBtn);
                
                subtaskListExecute.appendChild(subtaskElement);
            });
        }
    });
}

// Begin task
function beginTask(task, subtask) {
    // Update UI
    executeTitle.textContent = subtask.title;
    
    // Format and display done criteria
    const criteria = subtask.doneCriteria;
    doneCriteriaDisplay.innerHTML = `Done when <span class="highlight">${criteria.quantity}</span> ${criteria.deliverable} are <span class="highlight">${criteria.action}</span> with <span class="highlight">${criteria.quality}</span>`;
    doneCriteriaDisplay.style.display = 'block';
    
    // Reset timer state for new task
    state.currentSubtask = subtask;
    state.currentTimer = subtask.time * 60; // Convert minutes to seconds
    state.pauseUsed = false;
    state.resetUsed = false;
    remainingSeconds = state.currentTimer;
    isPaused = true;
    
    // Update UI elements
    timer.textContent = formatTimeDisplay(remainingSeconds);
    timer.classList.add('active');
    playPauseBtn.disabled = false;
    resetBtn.disabled = false;
    playPauseBtn.classList.remove('disabled');
    resetBtn.classList.remove('disabled');
    
    // Hide task panel and update CTAs
    taskPanel.classList.remove('show');
    listViewBtn.classList.remove('panel-open');
    pickTaskBtn.style.display = 'none';
    finishBtn.style.display = 'block';
}

// Event Listeners
pickTaskBtn.addEventListener('click', () => {
    taskPanel.classList.add('show');
    listViewBtn.classList.add('panel-open');
});

listViewBtn.addEventListener('click', () => {
    const isPanelOpen = taskPanel.classList.contains('show');
    if (isPanelOpen) {
        taskPanel.classList.remove('show');
        listViewBtn.classList.remove('panel-open');
    } else {
        taskPanel.classList.add('show');
        listViewBtn.classList.add('panel-open');
    }
});

closeTaskPanelBtn.addEventListener('click', () => {
    taskPanel.classList.remove('show');
    listViewBtn.classList.remove('panel-open');
});

playPauseBtn.addEventListener('click', toggleTimer);
resetBtn.addEventListener('click', resetTimer);

finishBtn.addEventListener('click', showCompletionModal);

// Show completion modal
function showCompletionModal() {
    // Stop and reset timer if it's running
    clearInterval(timerInterval);
    timer.textContent = formatTimeDisplay(state.currentTimer);
    remainingSeconds = state.currentTimer;
    isPaused = true;
    playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    
    // Show completion modal
    completionTaskTitle.textContent = state.currentSubtask.title;
    const criteria = state.currentSubtask.doneCriteria;
    completionDoneCriteria.innerHTML = `Done when <span class="highlight">${criteria.quantity}</span> ${criteria.deliverable} are <span class="highlight">${criteria.action}</span> with <span class="highlight">${criteria.quality}</span>`;
    completionNotes.value = '';
    completionModal.classList.add('show');
}

// Play confetti animation
function playConfetti() {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 2000 };

    function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
            return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, {
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        }));
        confetti(Object.assign({}, defaults, {
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        }));
    }, 250);

    return new Promise(resolve => setTimeout(resolve, duration));
}

// Handle task completion
async function handleTaskCompletion(isCompleted) {
    const subtaskElement = document.querySelector(`[data-subtask-id="${state.currentSubtask.id}"]`);
    if (subtaskElement) {
        const beginBtn = subtaskElement.querySelector('.begin-task-btn');
        const statusChip = document.createElement('span');
        statusChip.className = `status-chip ${isCompleted ? 'complete' : 'incomplete'}`;
        statusChip.textContent = isCompleted ? 'Complete' : 'Incomplete';
        beginBtn.replaceWith(statusChip);
    }

    if (isCompleted) {
        await playConfetti();
    }

    completionModal.classList.remove('show');
    resetExecuteMode();
}

// Reset execute mode
function resetExecuteMode() {
    executeTitle.textContent = 'Pick a task to begin';
    doneCriteriaDisplay.style.display = 'none';
    timer.textContent = '00:00';
    timer.classList.remove('active');
    playPauseBtn.disabled = true;
    resetBtn.disabled = true;
    state.currentSubtask = null;
    state.currentTimer = null;
    state.pauseUsed = false;
    state.resetUsed = false;
    
    pickTaskBtn.style.display = 'block';
    finishBtn.style.display = 'none';
}

// Event Listeners
noBtn.addEventListener('click', () => handleTaskCompletion(false));
yesBtn.addEventListener('click', () => handleTaskCompletion(true));

// Toggle mode pill dropdown
modePillDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
    modePillDropdown.classList.toggle('open');
    updateModeOptions();
});

// Close dropdown when clicking outside
document.addEventListener('click', () => {
    modePillDropdown.classList.remove('open');
});

// Update mode options based on current mode
function updateModeOptions() {
    const options = modeOptions.querySelectorAll('.mode-option');
    options.forEach(option => {
        option.classList.toggle('active', option.dataset.mode === getCurrentMode());
    });
}

// Get current mode
function getCurrentMode() {
    return state.isExecuteMode ? 'execute' : 'plan';
}

// Switch mode handler
function switchMode(mode) {
    if (mode === 'execute' && state.tasks.length === 0) {
        showEmptyState();
        return;
    }

    if (mode === 'execute') {
        enterExecuteMode();
    } else {
        exitExecuteMode();
    }

    currentMode.textContent = mode === 'execute' ? 'Execute mode' : 'Plan mode';
    modePillDropdown.classList.remove('open');
}

// Show empty state
function showEmptyState() {
    emptyState.style.display = 'flex';
    executeMode.style.display = 'flex';
    planMode.style.display = 'none';
    state.isExecuteMode = true;
    currentMode.textContent = 'Execute mode';
    executeMode.style.display = 'none';
}

// Hide empty state
function hideEmptyState() {
    emptyState.style.display = 'none';
    executeMode.style.display = 'flex';
}

// Mode option click handler
modeOptions.addEventListener('click', (e) => {
    const option = e.target.closest('.mode-option');
    if (option) {
        switchMode(option.dataset.mode);
    }
});

// Switch mode button click handler
switchModeBtn.addEventListener('click', () => {
    switchMode('plan');
});

// Add exitExecuteMode function
function exitExecuteMode() {
    state.isExecuteMode = false;
    modePill.classList.remove('execute');
    planMode.style.display = 'flex';
    executeMode.style.display = 'none';
    emptyState.style.display = 'none';
    
    // Reset any active timers
    clearInterval(timerInterval);
    state.currentSubtask = null;
    state.currentTimer = null;
    state.pauseUsed = false;
    state.resetUsed = false;
}

// Initial render and button state
renderTasks();
updateAddButtonState();

// Add CSS classes for disabled state
let styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
    .timer-btn.disabled {
        opacity: 0.5;
        cursor: not-allowed !important;
    }
`, styleSheet.cssRules.length); 