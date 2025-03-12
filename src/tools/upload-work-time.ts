import { launchCommand, Tool, AI, LaunchType, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { isAuthenticated, submitTime } from "../api/api";
import { getEmployeeInfo } from "../api/employeeinfo";

const currentDate = new Date();
const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, "0"); // 01-12 format
const currentYear = currentDate.getFullYear().toString();

interface Preferences {
  employeeNumber: string;
}

type Input = {
  /**
   * The day the user wants to upload the working time
   */
  day: string;
  /**
   * The duration of the break the user took on that day given in minutes.
   */
  breakTime: string;
  /**
   * The beginning of the users working day, change it to the following format HH:MM
   */
  startTime: string;
  /**
   * The end of the users working day, change it to the following format HH:MM
   */
  endTime: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const day = input.day || "today";

  return {
    message: `Do you want to submit the time for ${day}?`,
  };
};

/**
 * Uploads the working time the user entered for either a day or a specified time period
 */
export default async function tool(input: Input) {
  try {
    const isAuth = await isAuthenticated();
    if (!isAuth) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Authentication failed",
        message: "Please check your credentials",
      });
      return;
    }

    const employeeNumber = getPreferenceValues().employeeNumber;
    const employeeName = await getEmployeeInfo(employeeNumber);

    const today = new Date(input.day);

    const startDate = new Date(`${input.day}T${input.startTime}`);
    
    const endDate = new Date(`${input.day}T${input.endTime}`);

    const breakTime = input.breakTime || "60"
    
    // Submit time directly
    await submitTime({
      startDate,
      endDate,
      breakTime,
    });
    

    return {message: `I have uploaded the times for you ${employeeName}`};

  } catch (error) {
    console.error("Error at uploading the times:", error);
    return "Sorry, there was an error uploading your working times. Please try again.";
  }
}
