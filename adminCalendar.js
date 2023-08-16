// CALENDAR DISPLAY/INTERACTION
// Get a reference to the calendar grid
const calendarGrid = document.querySelector('.calendar-grid');

// date variables
let selectedStartDate = null;
let selectedStartDateUtc = null;
let selectedEndDate = null;
let selectedEndDateUtc = null;

// Get the current date
const currentDate = new Date();
let currentYear = currentDate.getFullYear();
let currentMonth = currentDate.getMonth();

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

// Display the current month initially
generateCalendarDays(currentYear, currentMonth);
document.getElementById('current-month').textContent = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentDate);

// Button event listeners to navigate to previous and next months
document.getElementById('prev-month-btn').addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 0) {
      currentYear--;
      currentMonth = 11; 
  }
  generateCalendarDays(currentYear, currentMonth);
  document.getElementById('current-month').textContent = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(currentYear, currentMonth, 1));

  // Update the click event listeners for the days after changing the month
  updateClickEventListeners();
});

document.getElementById('next-month-btn').addEventListener('click', () => {
  currentMonth++;
  if (currentMonth > 11) {
      currentYear++;
      currentMonth = 0; // January (0-based)
  }
  generateCalendarDays(currentYear, currentMonth);
  document.getElementById('current-month').textContent = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(currentYear, currentMonth, 1));

  // Update the click event listeners for the days after changing the month
  updateClickEventListeners();
});

// Function to update click event listeners for the days after changing the month
function updateClickEventListeners() {
  const calendarDays = document.querySelectorAll('.day:not(.empty)');
  calendarDays.forEach(day => {
      day.removeEventListener('click', handleDayClick); // Remove the old click event listener
      day.addEventListener('click', handleDayClick); // Add the updated click event listener
  });
}

// Make dates clickable - do not allow empty squares to be clicked
const calendarDays = document.querySelectorAll('.day:not(.empty');
calendarDays.forEach(day => {
  day.addEventListener('click', handleDayClick);
});

// DROPDOWN MENUS
// Get references to the dropdown menus
const startTimeDropdown = document.getElementById('start-time-dropdown');
const endTimeDropdown = document.getElementById('end-time-dropdown');

// Function to populate dropdown menus with times
function populateDropdownWithTimes(year, month) {
  // Get the user's time zone
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  console.log(userTimeZone)
  // Options to display times in AM/PM format
  const userTimeZoneOptions = {
    timeZone: userTimeZone,
    hour12: true,
    hour: 'numeric',
    minute: 'numeric',
  };

  times.forEach(time => {
    // Convert the UTC time string to a Date object
    const monthString = (month +1).toString().padStart(2, '0');
    const utcTime = new Date(`${year}-${monthString}-01T${time}:00Z`);
    console.log(utcTime);
    // Get the local time in the user's time zone
    const localTime = utcTime.toLocaleTimeString('en-US', userTimeZoneOptions);

    const option = document.createElement('option');
    option.textContent = localTime;
    option.value = time;

    startTimeDropdown.appendChild(option.cloneNode(true));
    endTimeDropdown.appendChild(option.cloneNode(true));
  });
}

// Set the start and end times in UTC format
const times = [
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
];

// Call the function to populate the dropdown menus with times from the current year and month
populateDropdownWithTimes(currentYear, currentMonth);

// Store the selected times
let selectedStartTime = null;
let selectedEndTime = null;

// Event listeners for dropdown menus
startTimeDropdown.addEventListener('change', (e) => {
  selectedStartTime = e.target.value;
  console.log(`Selected Start Time: ${selectedStartTime}`);
})

endTimeDropdown.addEventListener('change', (e) => {
  selectedEndTime = e.target.value;
  console.log(`Selected End Time: ${selectedEndTime}`);
})

// SELECTING START AND END DATES
// flag for toggle
let isSelectingStartDate = true;

// Function to handle click events on calendar days
function handleDayClick(event) {
  const clickedDay = event.target;
  const dayNumber = clickedDay.textContent
  const dayOfWeek = new Date(currentYear, currentMonth, dayNumber).getDay();
  const selectedEndDateElement = document.getElementById('selected-end-date');

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

    // Update the dropdown menus with the correct year/month
    populateDropdownWithTimes(selectedYear, selectedMonth)

    // Create local date object from the clicked date for updating the HTML
    const selectedStartDateInfo = new Date(selectedYear, selectedMonth, selectedDay);
    // Create UTC date object for api calls
    selectedStartDateUTC = new Date(Date.UTC(selectedYear, selectedMonth, selectedDay));

    isSelectingStartDate = false;

    // Update the HTML element to show selected start date
    const selectedStartDateElement = document.getElementById('selected-start-date');
    selectedStartDateElement.textContent = `Selected Start Date: ${selectedStartDateInfo.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
  } else {
    selectedEndDate = clickedDay;

    selectedEndDate.classList.add('selected');

    const selectedYear = parseInt(clickedDay.getAttribute('data-year'));
    const selectedMonth = parseInt(clickedDay.getAttribute('data-month'));
    const selectedDay = dayNumber;

    // Create local date object for updating the HTML
    const selectedEndDateInfo = new Date(selectedYear, selectedMonth,selectedDay);
    // Create UTC date object for api calls
    selectedEndDateUtc = new Date(Date.UTC(selectedYear, selectedMonth, selectedDay));

    // Highlight dates between start and end dates
    const startDateIndex = parseInt(selectedStartDate.textContent);
    const endDateIndex = parseInt(selectedEndDate.textContent);

    if (endDateIndex >= startDateIndex) {
      // Iterate through the days between start and end dates
      const daysBetween = endDateIndex - startDateIndex;
      for (let i = 0; i < daysBetween; i++) {
        const indexToHighlight = startDateIndex + i;
        const dayToHighlight = calendarDays[indexToHighlight];
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
  })
}

// API CALLS
// base URL
const baseUrl = 'http://MackScheduler.eba-najyqvxe.us-east-2.elasticbeanstalk.com/api/';

// Get references to the buttons
const getAppointmentsButton = document.getElementById('get-appointments-button');
const getBlockedTimesButton = document.getElementById('get-blocked-times-button');
const blockTimesButton = document.getElementById('block-times-button');
const unblockTimesButton = document.getElementById('unblock-times-button');
getAppointmentsButton.addEventListener('click', () => {
  console.log('getAppointments click')
});

getBlockedTimesButton.addEventListener('click', () => {
  console.log('getBlockedTimes click')
});

blockTimesButton.addEventListener('click', () => {
  console.log('blockTimes click')
});

unblockTimesButton.addEventListener('click', () => {
  console.log('unblockTimes click')
});

