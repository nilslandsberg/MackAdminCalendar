// CALENDAR DISPLAY/INTERACTION
// Get a reference to the calendar grid
const calendarGrid = document.querySelector('.calendar-grid');

// date variables
let selectedStartDate = null;
let selectedStartDateUtc = null;
let selectedEndDate = null;
let selectedEndDateUtc = null;
let selectedDate = null;

// Variables to store the selected start/end times
let selectedStartTime = null;
let selectedEndTime = null;

// Reschedule Modal Variables
let rescheduleAppointmentId = null;
let selectedRescheduleDate = null;
let selectedRescheduleTime = null;
let selectedRescheduleDateUtcString = null;

// Get the current date
const currentDate = new Date();
let currentYear = currentDate.getFullYear();
let currentMonth = currentDate.getMonth();

// flag for toggle if selecting start date
let isSelectingStartDate = true;

// Set the start and end times for dropdown start date/end date time menus in UTC format
const times = [
  "13:00:00Z",
  "14:00:00Z",
  "15:00:00Z",
  "16:00:00Z",
  "17:00:00Z",
  "18:00:00Z",
  "19:00:00Z",
  "20:00:00Z",
  "21:00:00Z"
];

// API CALLS
// base URL
const baseUrl = 'https://mack.spoken-app.com/api/';

// Get references to the call buttons
const getBlockedTimesButton = document.getElementById('get-blocked-times-button');
const blockTimesButton = document.getElementById('block-times-button');
const unblockTimesButton = document.getElementById('unblock-times-button');
const getClientsButton = document.getElementById('get-clients-button');

// Get references to the dropdown menus
const startTimeDropdown = document.getElementById('start-time-dropdown');
const endTimeDropdown = document.getElementById('end-time-dropdown');

// Get references to the elements within the reschedule modal
const calendarGridModal = document.querySelector('.calendar-grid-modal');
const currentMonthModal = document.getElementById('current-month-modal');
const prevMonthBtnModal = document.getElementById('prev-month-btn-modal');
const nextMonthBtnModal = document.getElementById('next-month-btn-modal');
const modalDropdown = document.getElementById('reschedule-time-dropdown');

const calendarDays = document.querySelectorAll('.day');

calendarGrid.addEventListener('click', function (event) {
  const clickedDay = event.target;
  if (clickedDay.classList.contains('day')) {
    handleDayClick(event);
  }
});

document.getElementById('current-month').textContent = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentDate);

// Button event listeners to navigate to previous month button
document.getElementById('prev-month-btn').addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 0) {
      currentYear--;
      currentMonth = 11; 
  }

  generateCalendarDays(currentYear, currentMonth);
  document.getElementById('current-month').textContent = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(currentYear, currentMonth, 1));

  populateDropdownWithTimes(currentYear, currentMonth);
});

// Button event listener to navigate to next month button
document.getElementById('next-month-btn').addEventListener('click', () => {
  currentMonth++;
  if (currentMonth > 11) {
      currentYear++;
      currentMonth = 0; // January (0-based)
  }
  generateCalendarDays(currentYear, currentMonth);
  document.getElementById('current-month').textContent = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(currentYear, currentMonth, 1));

  populateDropdownWithTimes(currentYear, currentMonth);
});

// Event listeners for dropdown menus
startTimeDropdown.addEventListener('change', (e) => {
  selectedStartTime = e.target.value;
})

endTimeDropdown.addEventListener('change', (e) => {
  selectedEndTime = e.target.value;
})

// Event listener for get clients button
getClientsButton.addEventListener('click', () => {
  getClients();
});

// Event listener for get blocked times button
getBlockedTimesButton.addEventListener('click', () => {
  if (!selectedStartDateUtc && !selectedEndDateUtc) {
    console.log('You must select a start and end date')
    return;
  }

  if (selectedStartTime) {
    updateSelectedStartTime();
  }

  if (selectedEndTime) {
    updateSelectedEndTime();
  }

  fetchBlockedTimes(selectedStartDateUtc, selectedEndDateUtc);
});

// Event listener for block times button
blockTimesButton.addEventListener('click', () => {
  if (!selectedStartDateUtc && !selectedEndDateUtc) {
    console.log('You must select a start and end date')
    return;
  }

  if (selectedStartTime) {
    updateSelectedStartTime();
  }

  if (selectedEndTime) {
    updateSelectedEndTime();
  }

  const reqBody = {
    reqStartDate: selectedStartDateUtc,
    reqEndDate: selectedEndDateUtc
  }

  blockTimes(`${baseUrl}/admin/block-times`, reqBody)
    .then(data => {
      console.log('POST request successful', data);
    })
});

// Event listener for unblock times button
unblockTimesButton.addEventListener('click', () => {
  if (!selectedStartDateUtc && !selectedEndDateUtc) {
    console.log('You must select a start and end date')
    return;
  }

  if (selectedStartTime) {
    updateSelectedStartTime();
  }

  if (selectedEndTime) {
    updateSelectedEndTime();
  }

  const reqBody = {
    reqStartDate: selectedStartDateUtc,
    reqEndDate: selectedEndDateUtc
  }

  unblockTimes(`${baseUrl}/admin/block-times`, reqBody)
  .then(data => {
    console.log('DELETE request successful', data);
  })
});

// Event listener for previous month button in reschedule webinar modal
prevMonthBtnModal.addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 0) {
      currentYear--;
      currentMonth = 11; 
  }

  generateCalendarDaysModal(currentYear, currentMonth);
  currentMonthModal.textContent = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(currentYear, currentMonth, 1));
})

// Event listener for next month button in reschedule webinar modal
nextMonthBtnModal.addEventListener('click', () => {
  currentMonth++;
  if (currentMonth > 11) {
      currentYear++;
      currentMonth = 0; 
  }
  generateCalendarDaysModal(currentYear, currentMonth);
  currentMonthModal.textContent = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(currentYear, currentMonth, 1));
});

document.getElementById("reschedule-cancel").addEventListener("click", () => {
  rescheduleAppointmentId = null;
  hideModal();
})

document.getElementById("reschedule-confirm").addEventListener("click", () => {
  rescheduleWebinar()
  hideModal();
})

// Event listener for the modal reschedule times dropdown
modalDropdown.addEventListener('change', handleModalTimeSelection);

// Function to generate calendar days
function generateCalendarDays(year, month) {
  // Clear the existing days
  calendarGrid.innerHTML = '';

  // Get the number of days in the specified month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Get the first day of the month (0-6 for Sunday-Saturday)
  const firstDay = new Date(year, month, 1).getDay();

  // Add empty cells for previous month days
  for (let i = 0; i < firstDay; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.classList.add('day', 'empty');
      calendarGrid.appendChild(emptyCell);
  }

  // Add the days for the current month
  for (let day = 1; day <= daysInMonth; day++) {
      const calendarDay = document.createElement('div');
      calendarDay.classList.add('day');
      calendarDay.textContent = day;

      // Store the year and month data attributes on each calendar day
      calendarDay.setAttribute('data-year', year);
      calendarDay.setAttribute('data-month', month);
      calendarDay.setAttribute('data-day', day);
      calendarGrid.appendChild(calendarDay);
  }
}


// Function to populate dropdown menus with times
function populateDropdownWithTimes(year, month) {
  // Get the user's time zone
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  // Options to display times in AM/PM format
  const userTimeZoneOptions = {
    timeZone: userTimeZone,
    hour12: true,
    hour: 'numeric',
    minute: 'numeric',
  };

  times.forEach(time => {
    // Convert the UTC time string to a Date object
    // Make sure that if the month is a single digit that it is preceded by a 0
    const monthString = (month +1).toString().padStart(2, '0');
    const utcTime = new Date(`${year}-${monthString}-01T${time}`);
    // Get the local time in the user's time zone
    const localTime = utcTime.toLocaleTimeString('en-US', userTimeZoneOptions);

    const option = document.createElement('option');
    option.textContent = localTime;
    option.value = time;

    startTimeDropdown.appendChild(option.cloneNode(true));
    endTimeDropdown.appendChild(option.cloneNode(true));
  });
}

// Function to handle click events on calendar days
function handleDayClick(event) {
  const clickedDay = event.target;
  const dayNumber = clickedDay.textContent
  const dayOfWeek = new Date(currentYear, currentMonth, dayNumber).getDay();
  const selectedEndDateElement = document.getElementById('selected-end-date');

  if (!clickedDay) {
    return;
  }
  // Check if the clicked day is Saturday or Sunday
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return;  // Stop the function if the clicked day is Saturday or Sunday
  }

  if (isSelectingStartDate) {
    clearSelection();
    selectedEndDateElement.textContent = "Select End Date";

    selectedStartDate = clickedDay;
    selectedStartDate.classList.add('selected');

    const selectedYear = parseInt(clickedDay.getAttribute('data-year'));
    const selectedMonth = parseInt(clickedDay.getAttribute('data-month'));
    const selectedDay = dayNumber;

    // Create local date object from the clicked date for updating the HTML
    const selectedStartDateInfo = new Date(selectedYear, selectedMonth, selectedDay);
    // Create UTC date object string for api calls
    selectedStartDateUtc = new Date(Date.UTC(selectedYear, selectedMonth, selectedDay)).toISOString();

    isSelectingStartDate = false;

    // Update the HTML element to show selected start date
    const selectedStartDateElement = document.getElementById('selected-start-date');
    selectedStartDateElement.textContent = `Selected Start Date: ${selectedStartDateInfo.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
  } else {
    selectedEndDate = clickedDay;
    
    // Get the first day of the month (0-6 for Sunday-Saturday)
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();


    const selectedYear = parseInt(clickedDay.getAttribute('data-year'));
    const selectedMonth = parseInt(clickedDay.getAttribute('data-month'));
    const selectedDay = dayNumber;
    
    // Create local date object for updating the HTML
    const selectedEndDateInfo = new Date(selectedYear, selectedMonth,selectedDay);
    // Create UTC date object string for api calls
    selectedEndDateUtc = new Date(Date.UTC(selectedYear, selectedMonth, selectedDay)).toISOString();

    // Highlight dates between start and end dates
    const startDateIndex = parseInt(selectedStartDate.textContent);
    const endDateIndex = parseInt(selectedEndDate.textContent);
   
    if (endDateIndex >= startDateIndex) {
      // Find the index of the selected start date within calendarDays NodeList
      const startIndex = Array.from(calendarDays).indexOf(selectedStartDate);
    
      // Find the index of the selected end date within calendarDays NodeList
      const endIndex = Array.from(calendarDays).indexOf(selectedEndDate);
    
      // Iterate through the days between start and end dates
      for (let i = startIndex + 1; i < endIndex; i++) {
        const dayToHighlight = calendarDays[i];
        const dayOfWeekToHighlight = new Date(
          currentYear,
          currentMonth,
          parseInt(dayToHighlight.textContent)
        ).getDay();
    
        // Check if the day to highlight is not Saturday or Sunday
        if (dayOfWeekToHighlight !== 0 && dayOfWeekToHighlight !== 6) {
          dayToHighlight.classList.add('selected');
        }
      }
    // Update the HTML element
    selectedEndDateElement.textContent = `Selected End Date: ${selectedEndDateInfo.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
    } else {
      console.log('End date must be later than start date')
      selectedEndDate.classList.remove('selected');
      return;
    }
    isSelectingStartDate = true;
  }
}

// Function to clear selected date range
function clearSelection () {
  const selectedDates = document.querySelectorAll('.day.selected');
  selectedDates.forEach(date => {
    date.classList.remove('selected');
  });
  selectedStartDate = null;
  selectedStartDateUTC = null;
  selectedEndDate = null;
  selectedEndDateUtc = null;
}

async function fetchAppointments() {
  const currentDate = new Date();
  const endDate = new Date();
  endDate.setDate(currentDate.getDate() + 30);

  const startDateISO = currentDate.toISOString();
  const endDateISO = endDate.toISOString();
  try {
    const response = await fetch(`${baseUrl}admin/appointment/${startDateISO}/${endDateISO}`);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    const bookedAppointments = data.bookedAppointments;
    if (bookedAppointments.length === 0) {
      console.log('There are no upcoming appointments');
    } else {
      bookedAppointments.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA - dateB;
      });

      renderAppointments(bookedAppointments);
    }
  } catch (error) {
    console.error('Error fetching appointments', error);
  }
}

function renderAppointments(appointments) {
  const appointmentsContainer = document.getElementById("appointments-container");
  appointmentsContainer.innerHTML = ""; // Clear previous content

  const appointmentCardsContainer = document.createElement("div");
  appointmentCardsContainer.className = "appointment-cards-container";

  appointments.forEach(appointment => {
    const appointmentCardContainer = document.createElement("div");
    appointmentCardContainer.className = "appointment-card-container"

    const appointmentElement = document.createElement("div");
    appointmentElement.className = "appointment";

    const appointmentDate = new Date(appointment.date);
    const appointmentDateString = appointmentDate.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    const appointmentTime = appointmentDate.toLocaleString("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true
    });

    const clientInfo = appointment.client;
    const truckToTour = appointment.truckToTour;
    const webinarId = appointment.vimeoWebinarInfo.webinarId;

    const appointmentContent = `
      <div class="client-info">
        <p><strong>Client:</strong> ${clientInfo.firstName} ${clientInfo.lastName}</p>
        <p><strong>Email:</strong> ${clientInfo.email}</p>
        <p><strong>Phone:</strong> ${clientInfo.businessPhone}</p>
        <p><strong>Company:</strong> ${clientInfo.companyName}</p>
      </div>
      <div class="appointment-date">${appointmentDateString} - ${appointmentTime}</div>
      <div class="truck-info">
        <p><strong>Truck to Tour:</strong> ${truckToTour}</p>
      </div>
      <button class="start-webinar" data-webinar-id="${webinarId}">Start Webinar</button>
      <button class="reschedule-webinar" data-webinar-id="${webinarId}">Reschedule Webinar</button>
      <button class="cancel-webinar" data-webinar-id="${webinarId}">Cancel Webinar</button>
    `;
    
    appointmentElement.innerHTML = appointmentContent;
    appointmentCardContainer.appendChild(appointmentElement);
    appointmentCardsContainer.appendChild(appointmentCardContainer);

    const startWebinarButton = appointmentElement.querySelector(".start-webinar");
    const rescheduleWebinarButton = appointmentElement.querySelector(".reschedule-webinar");
    const cancelWebinarButton = appointmentElement.querySelector(".cancel-webinar");

    startWebinarButton.addEventListener("click", () => {
      const webinarLink = `https://vimeo.com/manage/webinars/${webinarId}`;
      window.location.href = webinarLink;
    });

    rescheduleWebinarButton.addEventListener("click", () => {
      rescheduleAppointmentId = appointment._id;
      openCalendarModal();
    });

    cancelWebinarButton.addEventListener("click", () => {
      deleteAppointment(appointment._id, webinarId, appointmentElement)
    })
  });
  appointmentsContainer.appendChild(appointmentCardsContainer);
}

async function deleteAppointment(appointmentId, webinarId, appointmentElement) {
  try {
    const response = await axios.delete(`${baseUrl}admin/appointment/${appointmentId}/${webinarId}`);

    if (response.status === 200) {
      // Remove the appointment element from the DOM
      appointmentElement.parentNode.removeChild(appointmentElement);

      // Check if there are any remaining appointments in other containers
      const allContainers = document.querySelectorAll('.appointment-card-container');
      
      allContainers.forEach(container => {
        const remainingAppointments = container.querySelectorAll('.appointment');
        
        if (remainingAppointments.length === 0) {
          // If no remaining appointments in this container, remove it
          container.parentNode.removeChild(container);
        }
      });
    } else {
      console.error('Error deleting appointment: ', response.status);
    }
  } catch (error) {
    console.error('Error deleting appointment: ', error);
  }
}

function openCalendarModal() {
  const modalCurrentDate = new Date();
  const modalCurrentYear = modalCurrentDate.getFullYear();
  const modalCurrentMonth = modalCurrentDate.getMonth();

  currentMonthModal.textContent = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric'}).format(modalCurrentDate);
  generateCalendarDaysModal(modalCurrentYear, modalCurrentMonth);

  const modal = document.getElementById("reschedule-modal");
  modal.style.display = "block";

 
  const modalContent = document.querySelector(".modal-content");

}

function hideModal() {
  const modal = document.getElementById("reschedule-modal");
  modal.style.display = "none";
}

function handleModalTimeSelection(event) {
  const selectedTime = event.target.value;
  const selectedUtc = event.target.options[event.target.selectedIndex].getAttribute('data-utc');
  selectedRescheduleDateUtcString = selectedUtc
  console.log(selectedRescheduleDateUtcString)
}

function generateCalendarDaysModal(year, month) {
  calendarGridModal.innerHTML = '';

  // Get the number of days in the specified month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Get the first day of the month (0-6 for Sunday-Saturday)
  const firstDay = new Date(year, month, 1).getUTCDay();

  // Define an array for day labels
  const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Calculate the number of empty cells needed at the beginning of the calendar
  const emptyCells = (firstDay + 7) % 7;

  // Add empty cells for previous month days
  for (let i = 0; i < emptyCells; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.classList.add('day', 'empty');
    calendarGridModal.appendChild(emptyCell);
  }

  // Add the days for the current month
  for (let day = 1; day <= daysInMonth; day++) {
    const calendarDay = document.createElement('div');
    calendarDay.classList.add('day');
    calendarDay.textContent = day;

    calendarDay.addEventListener('click', handleModalDayClick);

    // Store the year and month data attributes on each calendar day
    calendarDay.setAttribute('data-year', year);
    calendarDay.setAttribute('data-month', month);
    calendarDay.setAttribute('data-day', day);
    calendarGridModal.appendChild(calendarDay);
  }
}


function handleModalDayClick(event) {
  const clickedDay = event.target;
  const dayNumber = clickedDay.textContent;
  const selectedYear = parseInt(clickedDay.getAttribute('data-year'));
  const selectedMonth = parseInt(clickedDay.getAttribute('data-month'));
  const selectedDay = parseInt(dayNumber);
  const dayOfWeek = new Date(selectedYear, selectedMonth, selectedDay).getDay(0)

  // Check if day is a Saturday or Sunday
  if ( dayOfWeek === 0 || dayOfWeek === 6) {
    return;
  }

  if (selectedRescheduleDate !== null) {
    selectedRescheduleDate.classList.remove('selected');
  }

  selectedRescheduleDate = clickedDay;
  selectedRescheduleDate.classList.add('selected');
  
  const selectedDateUtc = new Date(Date.UTC(selectedYear, selectedMonth, selectedDay));

  const selectedDateUtcString = selectedDateUtc.toISOString();

  fetchAvailableTimes(selectedDateUtcString);
}

async function rescheduleWebinar() {
  try {
    const reqBody = {
      newDate: selectedRescheduleDateUtcString
    };
    
    console.log(reqBody);
    console.log("appointmentId: ",rescheduleAppointmentId);
    const response = await axios.patch(`${baseUrl}admin/appointment/${rescheduleAppointmentId}`, reqBody);
    console.log('Request: ', response.request)
    if (response.status === 200) {
      // The update was successful, so you can fetch appointments and hide the modal.
      fetchAppointments();
      hideModal();
    } else {
      // Handle unexpected status codes with appropriate error messages.
      console.error('Error rescheduling appointment. Status:', response.status);
      // You might also want to display an error message to the user.
    }
  } catch (error) {
    // Handle any network errors or exceptions.
    console.error('Error rescheduling appointment:', error);
    // You can display a user-friendly error message here as well.
  }
}

function fetchAvailableTimes(selectedDate) {
  const availableTimes = fetch(`${baseUrl}calendar/times/${selectedDate}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      populateModalDropdown(data.availableTimes);
    })
    .catch(error => {
      console.error('Error fetching available times: ', error);
    })
}

function populateModalDropdown(times) {
  modalDropdown.innerHTML = ''; // Clear previous entries

  if (times.length === 0) {
    // If no available times, show the default option
    const defaultOption = document.createElement('option');
    defaultOption.textContent = 'No Times Available. Select Another Date';
    modalDropdown.appendChild(defaultOption);
  } else {

    const defaultOption = document.createElement('option');
    defaultOption.textContent = 'Select A Time';
    modalDropdown.appendChild(defaultOption);
    // Populate the dropdown with available times
    // Get the user's time zone
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Variable to display times in am/pm format
    const userTimeZoneOptions = {
      timeZone: userTimeZone,
      hour12: true,
      hour: 'numeric',
      minute: 'numeric',
    }

    times.forEach(time => {
      // Convert the date string into UTC Date
      const utcDate = new Date(time);
      // Set the time string to the user's local time zone
      const userTimeZoneTime = utcDate.toLocaleString('en-US', userTimeZoneOptions);
      const option = document.createElement('option');
      option.textContent = userTimeZoneTime;
      option.setAttribute('data-utc', time); // Stores the UTC string for access when selecting
      modalDropdown.appendChild(option);
    });
  }
}

function showRescheduleDropdown(webinarId, appointmentElement) {
  const rescheduleWebinarContainer = document.getElementById("reschedule-webinar-container");
  const rescheduleTimeDropdown = document.getElementById("reschedule-time-dropdown");

  // Calculate the position of the container above the appointment
  const appointmentRect = appointmentElement.getBoundingClientRect();
  rescheduleWebinarContainer.style.display = "block";
  rescheduleWebinarContainer.style.position = "absolute";
  rescheduleWebinarContainer.style.left = `${appointmentRect.left}px`;
  rescheduleWebinarContainer.style.top = `${appointmentRect.top - rescheduleWebinarContainer.clientHeight}px`;

  // Populate the dropdown with reschedule time options here
  // Example: You can use the same logic as in populateDropdownWithTimes function
  // populateDropdownWithTimes(rescheduleTimeDropdown);
}

async function fetchBlockedTimes(startDate, endDate) {
  try {
    const response = await fetch(`${baseUrl}admin/block-times/times/${startDate}/${endDate}`);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    const blockedTimes = data.blockedTimes;

    renderBlockedTimes(blockedTimes);

  } catch (error) {
    console.error('Error fetching appointments', error);
  }
}

function renderBlockedTimes(blockedTimes) {
  const blockedTimesContainer = document.getElementById("blocked-times-container");

  blockedTimesContainer.innerHTML = "";

  if (blockedTimes.length === 0) {
    // If no blocked times are found, display the message
    const noBlockedTimesMessage = document.createElement("div");
    noBlockedTimesMessage.style.fontWeight = "bold";
    noBlockedTimesMessage.textContent = "No blocked times found during the requested date/time range";
    noBlockedTimesMessage.className = "no-blocked-times-message";
    blockedTimesContainer.appendChild(noBlockedTimesMessage);
  } else {
    const blockedTimesByDate = {};

    blockedTimes.forEach(utcTimeString => {
      const utcDate = new Date(utcTimeString);
      // Get date in YYY-MM-DD format
      const dateKey = utcDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })

      if (!blockedTimesByDate[dateKey]) {
        blockedTimesByDate[dateKey] = [];
      }

      const timeString = utcDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      blockedTimesByDate[dateKey].push(timeString);
    });

    // Sort date keys in chronological order
    const sortedDateKeys = Object.keys(blockedTimesByDate).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateA - dateB;
    });

    // Iterate through the sorted date keys and create HTML elements
    sortedDateKeys.forEach(dateKey => {
      const dateElement = document.createElement("div");
      dateElement.className = "blocked-date";
      dateElement.style.fontWeight = "bold";
      dateElement.textContent = dateKey;

      const timesElement = document.createElement("ul");
      timesElement.className = "blocked-times";

      blockedTimesByDate[dateKey].forEach(blockedTime => {
        const timeItem = document.createElement("li");
        timeItem.textContent = blockedTime;
        timesElement.appendChild(timeItem);
      });

      // Create a single date-and-time div for each date
      const dateAndTimeDiv = document.createElement('div');
      dateAndTimeDiv.className = "date-and-time";

      // Append the date and times to the container
      dateAndTimeDiv.appendChild(dateElement);
      dateAndTimeDiv.appendChild(timesElement);
      blockedTimesContainer.appendChild(dateAndTimeDiv);
    });
  }
}


async function blockTimes(url, body) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    if (data) {
      fetchBlockedTimes(selectedStartDateUtc, selectedEndDateUtc)
    }
    return data;
  } catch (error) {
    console.error('Error making POST request', error);
  }
}

async function unblockTimes(url, body) {
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error making POST request', error);
  }
}

async function getClients() {
  try {
    const response = await fetch(`${baseUrl}admin/clients`);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    const clients = data.clients;
    console.log(clients);
  } catch (error) {
    console.error('Error fetching appointments', error);
  }
}

function updateSelectedStartTime() {
  // Create new Date objects using the selected date and time
  const selectedStartDateTime = new Date(selectedStartDateUtc);
  selectedStartDateTime.setUTCHours(Number(selectedStartTime.slice(0, 2)));
  selectedStartDateTime.setUTCMinutes(Number(selectedStartTime.slice(3, 5)));

  // Update the selected date and time
  selectedStartDateUtc = selectedStartDateTime.toISOString();
}

function updateSelectedEndTime() {
  // Create new Date objects using the selected date and time
  const selectedEndDateTime = new Date(selectedEndDateUtc);
  selectedEndDateTime.setUTCHours(Number(selectedEndTime.slice(0, 2)));
  selectedEndDateTime.setUTCMinutes(Number(selectedEndTime.slice(3, 5)));

  // Update the selected date and time
  selectedEndDateUtc = selectedEndDateTime.toISOString();
}

// Display the current month initially
generateCalendarDays(currentYear, currentMonth);

// GET upcoming appointments on page load.
fetchAppointments();

// Populate start date/end date dropdowns with times
populateDropdownWithTimes(currentYear, currentMonth);