'use strict';

class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);
    clicks = 0;

    constructor(coords, distance, duration) {
        this.coords = coords; // [lat, lng]
        this.distance = distance; // in Km
        this.duration = duration; // in min
    };

    setDescription() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    };

    click() {
        this.clicks++;
    };
};

class Running extends Workout {
    type = 'running';

    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        // "setDescription()" is defined in "Workout" class but it's called here because it need to
        // access "type" field/property
        this.setDescription();
    };

    calcPace() {
        // min/Km
        this.pace = this.duration / this.distance;
        return this.pace;
    };
};

class Cycling extends Workout {
    type = 'cycling';

    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        // "setDescription()" is defined in "Workout" class but it's called here because it need to
        // access "type" field/property
        this.setDescription();
    };

    calcSpeed() {
        // Km/h
        this.speed = this.distance / (this.duration /60);
        return this.speed;
    };
};

//////////////////////////////////////////////////////////
// APPLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
    #map;
    #mapZoomLevel = 13;
    #mapEvent;
    #workouts = [];

    constructor() {
        // Called as soon as a new App class is created to get user's position
        this.#getPosition();

        // Get data from local storage
        this.#getLocalStorage();

        // Event handlers set the "this" keyword to the DOM element on which the event occurred. Bind set the
        // the "this" keyword to the object/class "App" itself
        form.addEventListener('submit', this.#newWorkout.bind(this));
        inputType.addEventListener('change', this.#toggleElevationField);
        containerWorkouts.addEventListener('click', this.#moveToPopup.bind(this))
    };

    #getPosition() {
        if (navigator.geolocation) {
            // "#loadMap" is a callback function so it is invoked as a regular function whith the "this" keyword
            // set to undefined. Bind set the "this" keyword to the object/class "App" itself
            navigator.geolocation.getCurrentPosition(this.#loadMap.bind(this), function(error) {
                console.log(error);
                alert('Could not get your position')
            });
        }
    };

    #loadMap(position) {
        const { latitude } = position.coords;
        const { longitude } = position.coords;
        const coords = [latitude, longitude];
    
        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

        L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        // "#showForm" is a callback function so it is invoked as a regular function whith the "this" keyword
        // set to undefined. Bind set the "this" keyword to the object/class "App" itself
        this.#map.on('click', this.#showForm.bind(this));

        this.#workouts.forEach(workout => {
            this.#renderWorkoutMarker(workout);
        });
    };

    #showForm(mapE) {
        this.#mapEvent = mapE;

        form.classList.remove('hidden');
        inputDistance.focus();
    };

    #hideForm() {
        // Empty inputs
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';

        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => form.style.display = 'grid', 1000);
    };

    #toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    };

    #newWorkout(e) {
        e.preventDefault();

        const validInputs = (...inputs) => inputs.every(input => Number.isFinite(input));
        const allPositive = (...inputs) => inputs.every(input => input > 0);

        // Get data from form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const { lat, lng } = this.#mapEvent.latlng;
        let workout;

        // If workout running, create running object
        if (type === 'running') {
            const cadence = +inputCadence.value;

            // Check if data is valid
            if (
                !validInputs(distance, duration, cadence) || 
                !allPositive(distance, duration, cadence)
            ) return alert('Inputs have to be positive numbers!');

            workout = new Workout([lat, lng], distance, duration, cadence);
        }

        // If workout cycling, create cycling object
        if (type === 'cycling') {
            const elevation = +inputElevation.value;

            // Check if data is valid
            if (
                !validInputs(distance, duration, elevation) || 
                !allPositive(distance, duration)
            ) return alert('Inputs have to be positive numbers!');

            workout = new Cycling([lat, lng], distance, duration, elevation);
        }

        // Add new object to workout array
        this.#workouts.push(workout);

        // Render workout on map as marker
        this.#renderWorkoutMarker(workout);

        // Render workout on list
        this.#renderWorkout(workout);
        
        // Hide form and clear input fields
        this.#hideForm();

        // Set local storage to all workouts
        this.#setLocalStorage();
    };

    #renderWorkoutMarker(workout) {
        L.marker(workout.coords).addTo(this.#map)
            .bindPopup(L.popup({
                maxWidth: 250,
                minWidth: 100,
                autoClose: false,
                closeOnClick: false,
                className: `${workout.type}-popup`
            }))
            .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
            .openPopup();
    };

    #renderWorkout(workout) {
        let html = `
            <li class="workout workout--${workout.type}" data-id="${workout.id}">
                <h2 class="workout__title">${workout.description}</h2>
                <div class="workout__details">
                    <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
                    <span class="workout__value">${workout.distance}</span>
                    <span class="workout__unit">km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⏱</span>
                    <span class="workout__value">${workout.duration}</span>
                    <span class="workout__unit">min</span>
                </div>
        `;

        if (workout.type === 'running') {
            html += `
                    <div class="workout__details">
                        <span class="workout__icon">⚡️</span>
                        <span class="workout__value">${workout.pace.toFixed(1)}</span>
                        <span class="workout__unit">min/km</span>
                    </div>
                    <div class="workout__details">
                        <span class="workout__icon">🦶🏼</span>
                        <span class="workout__value">${workout.cadence}</span>
                        <span class="workout__unit">spm</span>
                    </div>
                </li>
            `;
        }

        if (workout.type === 'cycling') {
            html += `
                    <div class="workout__details">
                        <span class="workout__icon">⚡️</span>
                        <span class="workout__value">${workout.speed.toFixed(1)}</span>
                        <span class="workout__unit">km/h</span>
                    </div>
                    <div class="workout__details">
                        <span class="workout__icon">⛰</span>
                        <span class="workout__value">${workout.elevationGain}</span>
                        <span class="workout__unit">m</span>
                    </div>
                </li>
            `;
        }

        form.insertAdjacentHTML('afterend', html);
    };

    #moveToPopup(e) {
        const workoutEl = e.target.closest('.workout');

        if (!workoutEl) return;

        const workout = this.#workouts.find(workout => workout.id === workoutEl.dataset.id);

        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animation: true,
            pan: {
                duration: 1
            }
        });

        // Using the public interface
        // workout.click();
    };

    #setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    };

    #getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));

        if (!data) return;

        this.#workouts = data;

        this.#workouts.forEach(workout => {
            this.#renderWorkout(workout);
        });
    };

    reset() {
        localStorage.removeItem('workouts');

        // Reload page
        location.reload();
    };
};

const app = new App();