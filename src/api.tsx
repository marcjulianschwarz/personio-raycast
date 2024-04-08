import axios from "axios";
import { Cache, getPreferenceValues, popToRoot, showHUD, showToast, Toast } from "@raycast/api";

const URL = "https://api.personio.de/v1";
const cache = new Cache();

interface PersonioToken {
  token: string;
  createdAt: string;
}

function getHoursBetweenDates(date1: Date, date2: Date): number {
  const diffInMilliseconds = Math.abs(date2.getTime() - date1.getTime());
  return diffInMilliseconds / (1000 * 60 * 60);
}

async function getTokenFromAPI() {
  console.log("Retrieving token from API");
  const url = URL + "/auth";

  const payload = {
    client_secret: getPreferenceValues().clientSecret,
    client_id: getPreferenceValues().clientId,
  };

  const headers = {
    accept: "application/json",
    "content-type": "application/json",
  };

  const res = await axios.post(url, payload, { headers });
  const data = res.data;
  const token = data.data.token;

  return token;
}

function setTokenInCache(token: string) {
  console.log("Saving token to cache");
  cache.set(
    "personioToken",
    JSON.stringify({
      token: token,
      createdAt: new Date().toString(),
    }),
  );
}

// this function uses the secrets to get a short-lived (one day) token
export async function getPersonioToken(caching = true) {
  if (!caching) {
    console.log("Ignoring caching");
    console.time("tapi");
    const token = await getTokenFromAPI();
    console.timeEnd("tapi");
    return token;
  }

  console.time("tcache");
  const cacheDataToken = cache.get("personioToken");
  console.log("Retrieving token");

  if (cacheDataToken) {
    console.log("there is a token in cache");
    const personioToken = JSON.parse(cacheDataToken) as PersonioToken;

    // Calculate whether the token is about to expire
    // if it is about to expire -> get a new token and save it to the cache
    // otherwise use the token retrieved from cache
    console.log("calculate expiration date of token");
    const now = new Date();
    const createdAt = new Date(personioToken.createdAt);
    const timeDiff = getHoursBetweenDates(now, createdAt);
    console.log("hours since token creation: " + timeDiff.toString());

    if (timeDiff > 22) {
      console.log("Token is about to expire.");
      const token = await getTokenFromAPI();
      setTokenInCache(token);
      console.timeEnd("tcache");
      return token;
    } else {
      console.log("Got Token from cache directly.");
      const token = personioToken.token;
      console.timeEnd("tcache");
      return token;
    }
  } else {
    console.log("There is no token in cache");
    const token = await getTokenFromAPI();
    setTokenInCache(token);
    console.timeEnd("tcache");
    return token;
  }
}

export async function addTime(
  employeeNumber: number,
  date: string,
  start_time: string,
  end_time: string,
  break_time: number,
  token: string,
) {
  const url = "https://api.personio.de/v1/company/attendances";

  const payload = {
    attendances: [
      {
        employee: employeeNumber,
        date: date,
        start_time: start_time,
        end_time: end_time,
        break: break_time,
      },
    ],
  };

  const headers = {
    accept: "application/json",
    "content-type": "application/json",
    authorization: "Bearer " + token,
  };

  try {
    axios.post(url, payload, { headers });
    await showHUD("Time Tracked 🎉");
    popToRoot();
  } catch (error) {
    if (axios.isAxiosError(error) && error.stack) {
      if (error.stack.includes("IncomingMessage.handleStreamEnd")) {
        console.log("Caught the specific error: IncomingMessage.handleStreamEnd");
        await showToast({ style: Toast.Style.Failure, title: "That didn't work!" });
      } else {
        // Handle other errors
        console.log("Some other Axios error occurred", error);
      }
    } else {
      console.log("An error occurred that is not an Axios error", error);
    }
  }
}
// the JSON structure returned by the personio API
export interface EmployeeJSON {
  type: string;
  attributes: {
    id: {
      label: string;
      value: number;
      type: string;
      universal_id: string;
    };
    preferred_name: {
      label: string;
      value: string;
      type: string;
      universal_id: string;
    };
  };
}

export interface Employee {
  id: number;
  name: string;
}

// Get a list of employees (this can be used to find your own personio employee number)
export async function getEmployees(token: string): Promise<Employee[]> {
  const url = URL + "/company/employees";
  const headers = {
    accept: "application/json",
    authorization: "Bearer " + token,
  };

  try {
    const res = await axios.get(url, { headers });
    const data = res.data.data as EmployeeJSON[];
    // convert the JSON data to Employee objects
    const employees = data.map((e) => ({ id: e.attributes.id.value, name: e.attributes.preferred_name?.value }));
    await showToast({ title: "Employees loaded", message: `${employees.length} Loaded employees successfully!` });
    return employees;
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "That didn't work!", message: "Unfortunate!" });
    return [];
  }
}

export interface AttendancePeriodJSON {
  id: number;
  type: string;
  attributes: {
    employee: number;
    date: string;
    start_time: string;
    end_time: string;
    break: number;
    comment: string;
    updated_at: string;
    status: string;
    project: number;
    is_holiday: boolean;
    is_on_time_off: boolean;
  };
}

export interface AttendancePeriod {
  id: number;
  employee: number;
  date: string;
  start_time: string;
  end_time: string;
  break: number;
  comment: string;
  updated_at: string;
  status: string;
  project: number;
  is_holiday: boolean;
  is_on_time_off: boolean;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export async function getAttendances(
  employeeNumber: number,
  token: string,
  currentYear: string,
  selectedMonth: string,
): Promise<AttendancePeriod[]> {
  const maxDays = daysInMonth(parseInt(currentYear), parseInt(selectedMonth));

  const url =
    URL +
    "/company/attendances?employees[]=" +
    employeeNumber +
    `&start_date=${currentYear}-${selectedMonth}-01&end_date=${currentYear}-${selectedMonth}-${maxDays}&includePending=true`;
  const headers = {
    accept: "application/json",
    authorization: "Bearer " + token,
  };

  try {
    const res = await axios.get(url, { headers });
    const data = res.data.data as AttendancePeriodJSON[];
    const attendances = data.map((a) => ({
      id: a.id,
      employee: a.attributes.employee,
      date: a.attributes.date,
      start_time: a.attributes.start_time,
      end_time: a.attributes.end_time,
      break: a.attributes.break,
      comment: a.attributes.comment,
      updated_at: a.attributes.updated_at,
      status: a.attributes.status,
      project: a.attributes.project,
      is_holiday: a.attributes.is_holiday,
      is_on_time_off: a.attributes.is_on_time_off,
    }));
    await showToast({
      title: "Loaded Attendances",
      message: `${attendances.length} Attendances in 2024 loaded successfully!`,
    });
    return attendances;
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "That didn't work!", message: "Unfortunate!" });
    console.log(error);
    return [];
  }
}

export async function getEmployeeInfo(id: number, token: string) {
  const url = URL + "/company/employees/" + id;
  const headers = {
    accept: "application/json",
    authorization: "Bearer " + token,
  };

  const res = await axios.get(url, { headers });
  const data = res.data;
  return data.data.attributes.preferred_name.value;
}
