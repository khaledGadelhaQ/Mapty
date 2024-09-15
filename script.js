'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapEvent;
  #zoomLevel = 13;
  #workouts = [];
  constructor() {
    this._getPosition();

    inputType.addEventListener('change', this._toggleElevationField.bind(this));

    form.addEventListener('submit', this._newWorkout.bind(this));

    containerWorkouts.addEventListener('click', this._goToPopup.bind(this));
  }
  _getPosition() {
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      this._failedCallBack
    );
  }
  _failedCallBack() {
    console.log(`Sorry we couldn't get your location😢`);
  }
  _loadMap(pos) {
    const { latitude } = pos.coords;
    const { longitude } = pos.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#zoomLevel);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    this.#map.on('click', this._showForm.bind(this));
    this._getLocalStorage();
  }
  _showForm(e) {
    this.#mapEvent = e;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _hideForm() {
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  _toggleElevationField(e) {
    e.preventDefault();
    // selecting the parent div for the input fields
    // and toggle the hidden class between them
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _emptyForm() {
    // empty the input fields
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';
    // remove the foucus from any of the form input fields
    inputCadence.blur();
    inputDuration.blur();
    inputElevation.blur();
    inputDistance.blur();
  }
  _markerPin(workout) {
    const coords = workout.coords;
    const popup = L.popup(coords, {
      maxWidth: 300,
      minWidth: 100,
      autoClose: false,
      closeOnClick: false,
      className: `${inputType.value}-popup`,
    }).setContent(
      `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
    );

    L.marker(coords).addTo(this.#map).bindPopup(popup).openPopup();
  }
  _newWorkout(e) {
    e.preventDefault();
    const lat = this.#mapEvent.latlng.lat;
    const lng = this.#mapEvent.latlng.lng;
    // check for the input validation must be A Positive number
    const validInput = (...inputs) => {
      return inputs.every(val => Number.isFinite(val) && val > 0);
    };
    const workoutType = inputType.value; // cycling or running
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    let workout;
    // what happens when user submit the form
    // 1. check if the input values are valid(positive number)
    if (workoutType == 'running') {
      const cadence = +inputCadence.value;
      if (!validInput(distance, duration, cadence)) {
        alert('Wrong input values!');
        this._emptyForm();
        return;
      }
      workout = new Running([lat, lng], duration, distance, cadence);
    }

    if (workoutType == 'cycling') {
      const elevation = +inputElevation.value;
      if (!validInput(distance, duration, elevation)) {
        alert('Wrong input values!');
        this._emptyForm();
        return;
      }
      workout = new Cycling([lat, lng], duration, distance, elevation);
    }
    // 2. create a object based on the type of inputType
    // 3. add the object to the workout objects
    this.#workouts.push(workout);

    // 4. pin popup on the map
    /// show the marker and the popup message
    // this._markerPin(workout);
    /// empty the formInputFields and hide the form
    this._emptyForm();
    this._hideForm();
    this._renderWorkout(workout);
    this._setLocalStorage();
  }
  _renderWorkout(workout) {
    const html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${
              workout.type === 'running'
                ? workout.pace.toFixed(1)
                : workout.speed.toFixed(1)
            }</span>
            <span class="workout__unit">${
              workout.type === 'running' ? 'min/km' : 'km/h'
            }</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🦶🏼' : '⛰'
            }</span>
            <span class="workout__value">${
              workout.type === 'running'
                ? workout.cadence
                : workout.elevationGain
            }</span>
            <span class="workout__unit">spm</span>
          </div>
      </li>
     `;
    form.insertAdjacentHTML('afterend', html);
    this._markerPin(workout);
  }
  _goToPopup(e) {
    const workout = e.target.closest('.workout');
    if (!workout) return;
    const workoutEL = this.#workouts.find(
      work => work.id === workout.dataset.id
    );
    this.#map.setView(workoutEL.coords, this.#zoomLevel);
  }
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage(){
    const data = JSON.parse(localStorage.getItem('workouts'));
    if(!data) return;
    this.#workouts = data;
    this.#workouts.forEach((work) =>{
      this._renderWorkout(work);
    })
  }
  reset(){
    localStorage.removeItem('workouts');
    location.reload();
  }
}

class Workout {
  today = new Date();
  date = months[this.today.getMonth()] + ' ' + this.today.getDate();
  id = String(this.today.getTime()).slice(-10);
  constructor(coords, duration, distance) {
    this.coords = coords; // [lat, lng]
    this.distance = distance;
    this.duration = duration;
  }

  _getDescription() {
    return this.type[0].toUpperCase() + this.type.slice(1) + ' on ' + this.date;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, duration, distance, elevationGain) {
    super(coords, duration, distance);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this.description = this._getDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, duration, distance, cadence) {
    super(coords, duration, distance);
    this.cadence = cadence;
    this.calacPace();
    this.description = this._getDescription();
  }

  calacPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

const app = new App(); // this should get the location from the gelocatino API and show the map
