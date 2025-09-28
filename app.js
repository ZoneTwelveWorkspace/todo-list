class TodoApp {
    constructor() {
        this.tasks = [];
        this.currentFilter = 'all';
        this.deferredPrompt = null;

        this.initialize();
        this.bindEvents();
        this.registerServiceWorker();
        this.setupPWAInstallation();
    }

    initialize() {
        // Load tasks from localStorage
        const savedTasks = localStorage.getItem('tasks');
        if (savedTasks) {
            this.tasks = JSON.parse(savedTasks);
        }

        this.renderTasks();
        this.updateTaskCount();
    }

    bindEvents() {
        // Add task
        document.getElementById('add-task-btn').addEventListener('click', () => this.addTask());
        document.getElementById('new-task').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });

        // Filter tasks
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });

        // Clear completed
        document.getElementById('clear-completed').addEventListener('click', () => this.clearCompleted());

        // Listen for storage changes (in case of multiple tabs)
        window.addEventListener('storage', () => {
            const savedTasks = localStorage.getItem('tasks');
            if (savedTasks) {
                this.tasks = JSON.parse(savedTasks);
                this.renderTasks();
                this.updateTaskCount();
            }
        });
    }

    addTask() {
        const input = document.getElementById('new-task');
        const text = input.value.trim();

        if (text) {
            const newTask = {
                id: Date.now(),
                text: text,
                completed: false,
                createdAt: new Date().toISOString()
            };

            this.tasks.push(newTask);
            this.saveTasks();
            this.renderTasks();
            this.updateTaskCount();

            input.value = '';
            input.focus();
        }
    }

    toggleTask(id) {
        const taskIndex = this.tasks.findIndex(task => task.id === id);
        if (taskIndex !== -1) {
            this.tasks[taskIndex].completed = !this.tasks[taskIndex].completed;
            this.saveTasks();
            this.renderTasks();
            this.updateTaskCount();
        }
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(task => task.id !== id);
        this.saveTasks();
        this.renderTasks();
        this.updateTaskCount();
    }

    setFilter(filter) {
        this.currentFilter = filter;

        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            }
        });

        this.renderTasks();
    }

    clearCompleted() {
        this.tasks = this.tasks.filter(task => !task.completed);
        this.saveTasks();
        this.renderTasks();
        this.updateTaskCount();
    }

    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));

        // Dispatch storage event for other tabs
        window.dispatchEvent(new Event('storage'));
    }

    renderTasks() {
        const taskList = document.getElementById('task-list');
        const emptyState = document.getElementById('empty-state');

        // Filter tasks based on current filter
        let filteredTasks = this.tasks;
        if (this.currentFilter === 'active') {
            filteredTasks = this.tasks.filter(task => !task.completed);
        } else if (this.currentFilter === 'completed') {
            filteredTasks = this.tasks.filter(task => task.completed);
        }

        // Clear current list
        taskList.innerHTML = '';

        // Show or hide empty state
        if (filteredTasks.length === 0) {
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';

            // Render each task
            filteredTasks.forEach(task => {
                const li = document.createElement('li');
                li.className = `task-item ${task.completed ? 'completed' : ''}`;
                li.dataset.id = task.id;

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'task-checkbox';
                checkbox.checked = task.completed;
                checkbox.addEventListener('change', () => this.toggleTask(task.id));

                const span = document.createElement('span');
                span.className = 'task-text';
                span.textContent = task.text;

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-btn';
                deleteBtn.innerHTML = '&times;';
                deleteBtn.addEventListener('click', () => this.deleteTask(task.id));

                li.appendChild(checkbox);
                li.appendChild(span);
                li.appendChild(deleteBtn);

                taskList.appendChild(li);
            });
        }
    }

    updateTaskCount() {
        const activeTasks = this.tasks.filter(task => !task.completed).length;
        document.getElementById('task-count').textContent = `${activeTasks} task${activeTasks !== 1 ? 's' : ''} left`;
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker registered with scope:', registration.scope);
                })
                .catch(error => {
                    console.log('Service Worker registration failed:', error);
                });
        }
    }

    setupPWAInstallation() {
        // Listen for beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later
            this.deferredPrompt = e;

            // Show install button
            const installButton = document.createElement('button');
            installButton.id = 'installButton';
            installButton.textContent = 'Install App';
            installButton.addEventListener('click', () => this.installPWA());

            document.body.insertBefore(installButton, document.querySelector('.container'));
            installButton.style.display = 'block';
        });

        // Listen for appinstalled event
        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            const installButton = document.getElementById('installButton');
            if (installButton) {
                installButton.style.display = 'none';
            }

            const status = document.createElement('div');
            status.id = 'status';
            status.textContent = 'App successfully installed!';
            document.body.insertBefore(status, document.querySelector('.container'));

            setTimeout(() => {
                if (document.getElementById('status')) {
                    document.getElementById('status').remove();
                }
            }, 3000);
        });
    }

    installPWA() {
        if (this.deferredPrompt) {
            // Show the install prompt
            this.deferredPrompt.prompt();

            // Wait for the user to respond to the prompt
            this.deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                } else {
                    console.log('User dismissed the install prompt');
                }
                this.deferredPrompt = null;

                // Hide install button
                const installButton = document.getElementById('installButton');
                if (installButton) {
                    installButton.style.display = 'none';
                }
            });
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TodoApp();
});
