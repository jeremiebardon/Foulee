# Foulée

Running training plans for one runner: structured workouts arranged into multi-week plans, with runs recorded against them.

## Language

### Training

**Workout**:
A reusable description of a run as a sequence of steps and repeat blocks (warm-up, run, recovery, cool-down), each sized by distance or time.
_Avoid_: Training, exercise, séance

**Plan**:
A multi-week schedule starting on a given date, made of Sessions.
_Avoid_: Program, block

**Session**:
One Workout scheduled on a given week and day of a Plan; it is done once a distance and a duration have been recorded against it.
_Avoid_: Run, entry, slot

### Garmin

**Activity**:
A run recorded by a Garmin device and read from Garmin Connect. An Activity is a fact that happened; a Session is an intention. The runner confirms a link between them; one Activity completes at most one Session.
_Avoid_: Run, workout, session, Garmin workout

**Unplanned Activity**:
An Activity not linked to any Session. It still counts as running done.
_Avoid_: Extra run, orphan activity

**Personal API Key**:
The secret a runner creates in Garmin Connect to let Foulée read their own Garmin data. It expires (30 days to one year) and is exchanged for short-lived access.
_Avoid_: Garmin token, Garmin password, credentials
