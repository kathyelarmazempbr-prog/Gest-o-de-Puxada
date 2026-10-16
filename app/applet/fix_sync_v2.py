
with open('src/services/localDataStore.ts', 'r') as f:
    content = f.read()

# Add firebaseSync.saveItem to addDriver
# Use a more specific pattern that includes the function header
add_driver_pattern = """  addDriver(driver: any): any[] {
    this.unmarkDeleted(driver.id);
    const current = this.getDrivers();
    const updated = [driver, ...current.filter(d => d.id !== driver.id)];
    this.saveDrivers(updated);
    return updated;
  },"""

add_driver_replacement = """  addDriver(driver: any): any[] {
    this.unmarkDeleted(driver.id);
    const current = this.getDrivers();
    const updated = [driver, ...current.filter(d => d.id !== driver.id)];
    this.saveDrivers(updated);
    if (driver && driver.id) {
      firebaseSync.saveItem('drivers', driver.id, driver).catch(() => {});
    }
    return updated;
  },"""

content = content.replace(add_driver_pattern, add_driver_replacement)

# Add firebaseSync.deleteItem to removeDriver
remove_driver_pattern = """  removeDriver(id: string): any[] {
    this.markAsDeleted(id, 'drivers');
    const current = this.getDrivers();
    const updated = current.filter(d => d.id !== id);
    this.saveDrivers(updated);
    return updated;
  },"""

remove_driver_replacement = """  removeDriver(id: string): any[] {
    this.markAsDeleted(id, 'drivers');
    const current = this.getDrivers();
    const updated = current.filter(d => d.id !== id);
    this.saveDrivers(updated);
    firebaseSync.deleteItem('drivers', id).catch(() => {});
    return updated;
  },"""

content = content.replace(remove_driver_pattern, remove_driver_replacement)

# Add firebaseSync.saveItem to addSchedule
add_schedule_pattern = """  addSchedule(schedule: any): any[] {
    this.unmarkDeleted(schedule.id);
    const current = this.getSchedules();
    const updated = [schedule, ...current.filter(s => s.id !== schedule.id)];
    this.saveSchedules(updated);
    return updated;
  },"""

add_schedule_replacement = """  addSchedule(schedule: any): any[] {
    this.unmarkDeleted(schedule.id);
    const current = this.getSchedules();
    const updated = [schedule, ...current.filter(s => s.id !== schedule.id)];
    this.saveSchedules(updated);
    if (schedule && schedule.id) {
      firebaseSync.saveItem('schedules', schedule.id, schedule).catch(() => {});
    }
    return updated;
  },"""

content = content.replace(add_schedule_pattern, add_schedule_replacement)

# Add firebaseSync.deleteItem to removeSchedule
remove_schedule_pattern = """  removeSchedule(id: string): any[] {
    this.markAsDeleted(id, 'schedules');
    const current = this.getSchedules();
    const updated = current.filter(s => s.id !== id);
    this.saveSchedules(updated);
    return updated;
  },"""

remove_schedule_replacement = """  removeSchedule(id: string): any[] {
    this.markAsDeleted(id, 'schedules');
    const current = this.getSchedules();
    const updated = current.filter(s => s.id !== id);
    this.saveSchedules(updated);
    firebaseSync.deleteItem('schedules', id).catch(() => {});
    return updated;
  },"""

content = content.replace(remove_schedule_pattern, remove_schedule_replacement)

with open('src/services/localDataStore.ts', 'w') as f:
    f.write(content)
