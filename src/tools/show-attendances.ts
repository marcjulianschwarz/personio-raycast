import { launchCommand, Tool, AI, LaunchType, getPreferenceValues } from "@raycast/api";
import { getAttendances } from "../api/attendances";

const currentDate = new Date();
const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0'); // 01-12 format
const currentYear = currentDate.getFullYear().toString();

interface Preferences {
  employeeNumber: string;
}

type Input = {
  /**
   * The relevant month
   */
  month: string;
  /**
   * The relevant year
   */
  year: string;
};

function getMonthName(month: string): string {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const monthNum = parseInt(month);
  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return "current month";
  }
  
  return monthNames[monthNum - 1];
}


export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const monthName = input.month ? getMonthName(input.month) : "current month";
  const yearText = input.year ? `${input.month ? " " : "for "}${input.year}` : "";
  
  return {
    message: `Show Personio attendances ${monthName}${yearText}?`,
  };
};

const employeeNumber = getPreferenceValues().employeeNumber;


/**
 * Shows attendance records for a specific month and year
 */
export default async function tool(input: Input) {
  try {

    const month = input.month || currentMonth;
    const year =  input.year || currentYear;


    const attendances = getAttendances(employeeNumber, year, month)

    return attendances

  }catch (error) {
    console.error("Error in attendance tool:", error);
    return "Sorry, there was an error fetching your attendance records. Please try again.";
  }
}

