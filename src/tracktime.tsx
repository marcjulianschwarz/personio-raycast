import { Action, ActionPanel, Detail, Form, Icon, getPreferenceValues, openCommandPreferences } from "@raycast/api";
import { useEffect, useState } from "react";
import { addTime, getAttendances, getEmployeeInfo, getPersonioToken } from "./api";
import moment from 'moment-timezone';

export default function TrackTime() {
  const [token, setToken] = useState("");
  const [startdate, set_startDate] = useState<Date | null>(null);
  const [enddate, set_endDate] = useState<Date | null>(null);
  const [breaktime, setBreak] = useState<string>("");

  const [employeeName, setEmployeeName] = useState("");

  useEffect(() => {
    async function call() {
      const token = await getPersonioToken();
      const employeeNumber = getPreferenceValues().employeeNumber;
      const employeeName = await getEmployeeInfo(employeeNumber, token);
      getAttendances(employeeNumber, token);
      setEmployeeName(employeeName);
      setToken(token);
    }
    call();
  }, []);


  function parseDateAndTime(dateString: string, timeZone: string = 'Europe/Berlin'): { date: string; time: string } {
    const date = moment.tz(dateString, timeZone);
  
    const formattedDate = date.format('YYYY-MM-DD');
    const formattedTime = date.format('HH:mm');
  
    return { date: formattedDate, time: formattedTime };
  }
  

  //calls the addTime function with the given values
  const submitTime = (values: any) => {
    const startdate = parseDateAndTime(values.startdate);
    const enddate = parseDateAndTime(values.enddate);
    const employeeNumber = getPreferenceValues().employeeNumber;
    console.log("Du hast heute von:");
    console.log(startdate.time, "bis", enddate.time);
    console.log("Mit", values.breaktime, "Minuten Pause gearbeitet");
    addTime(employeeNumber, startdate.date, startdate.time, enddate.time, parseInt(values.breaktime), token);
  };

  if (token) {
    return (
      <Form
        navigationTitle="Track Time"
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Submit Time"
              icon={Icon.Checkmark}
              onSubmit={(values) => submitTime({ startdate, enddate, breaktime })}
            />
            <Action title="Change Employee Number" icon={Icon.Person} onAction={openCommandPreferences} />
          </ActionPanel>
        }
      >
        <Form.Description
          title=""
          text={`Hi ${employeeName}\n\nTrack your time for today by specifying the start and end times of your working day and the break you took in minutes.\nPress cmd+enter to submit your time.`}
        />
        <Form.Separator />
        <Form.DatePicker id="launchDate" title="Start time" value={startdate} onChange={set_startDate} />
        <Form.DatePicker id="endDate" title="End time" value={enddate} onChange={set_endDate} />
        <Form.TextField id="breaktime" title="Break (in minutes)" value={breaktime} onChange={setBreak} />
      </Form>
    );
  } else {
    return <Detail isLoading={true} />;
  }
}
