// This script is designed to be run directly in the browser console or as a bookmarklet
// on a When2Meet event page.

/**
 * Generates the CSV content string from When2Meet data.
 * @param {object} options - Configuration for the CSV.
 * @param {string} [options.delimiter=","] - The character to separate columns.
 * @param {string} [options.timeFormat="12-hour"] - The time format ('12-hour' or '24-hour').
 * @returns {string|undefined} The CSV content as a string.
 */
function getCSV({ delimiter = ",", timeFormat = "12-hour" } = {}) {
    // Check if the required global variables from When2Meet exist
    if ([typeof PeopleNames, typeof PeopleIDs, typeof AvailableAtSlot, typeof TimeOfSlot].some(type => type === 'undefined')) {
        console.error("Error: Required When2Meet data variables (PeopleNames, etc.) are not available on this page.");
        alert("This script must be run on a When2Meet event page.");
        return;
    }

    let result = `Day${delimiter}Time${delimiter}` + PeopleNames.join(delimiter) + "\n";
    for (let i = 0; i < AvailableAtSlot.length; i++) {
        let slot = new Date(TimeOfSlot[i] * 1000);
        if (!slot) {
            console.error(`Error: Could not retrieve or format time slot for index ${i}.`);
            continue;
        }

        // Format the day and time
        let day = slot.toLocaleDateString('en-US', { weekday: 'short' });
        let time = slot.toLocaleTimeString('en-US', { hour12: timeFormat === "12-hour", hour: '2-digit', minute: '2-digit' });

        result += `${day}${delimiter}${time}${delimiter}`;
        
        // Map availability to 1 (available) and 0 (not available)
        result += PeopleIDs.map(id => AvailableAtSlot[i].includes(id) ? 1 : 0).join(delimiter);
        result += "\n";
    }
    return result;
}

/**
 * Triggers the download of the generated CSV file.
 * @param {object} options - Configuration for the download.
 * @param {string} [options.filename] - The desired filename.
 * @param {string} [options.delimiter=","] - The character to separate columns.
 * @param {string} [options.timeFormat="12-hour"] - The time format ('12-hour' or '24-hour').
 */
function downloadCSV({ filename, delimiter = ",", timeFormat = "12-hour" } = {}) {
    const urlParams = new URLSearchParams(window.location.search);
    const uniqueCode = urlParams.keys().next().value || 'UNKNOWNCODE';
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, "");
    if (!filename) {
        filename = `when2meet_${uniqueCode}_${timestamp}.csv`;
    }

    const content = getCSV({ delimiter, timeFormat });
    if (!content) {
        console.error("Error: Failed to generate CSV content.");
        return;
    }

    // FIX: Add a Byte Order Mark (BOM) and set the charset to UTF-8
    // The BOM (\uFEFF) tells programs like Excel to read the file as UTF-8.
    const bom = "\uFEFF";
    const file = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
    
    // Create a temporary link to trigger the download
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = filename;
    document.body.appendChild(link); // Required for Firefox
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}
downloadCSV({ delimiter: ";", timeFormat: "24-hour" });

// --- HOW TO USE ---
// 1. Go to your When2Meet event page.
// 2. Open the browser's developer console (usually by pressing F12).
// 3. Copy and paste all the code above into the console and press Enter.
// 4. To start the download, type one of the following commands and press Enter:

// Example 1: Download with a semicolon (;) delimiter and 24-hour time format
// downloadCSV({ delimiter: ";", timeFormat: "24-hour" });

// Example 2: Download with a comma (,) delimiter and 12-hour time format
// downloadCSV({ delimiter: ",", timeFormat: "12-hour" });