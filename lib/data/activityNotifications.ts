export type ActivityNotificationType = 'withdrawal' | 'upgrade' | 'bonus' | 'general'

export interface ActivityNotification {
  id: string
  type: ActivityNotificationType
  message: string
}

export const homeActivityNotifications: ActivityNotification[] = [
  {
    id: 'diane-withdrawal',
    type: 'withdrawal',
    message: '078845XXXXXX abikuje 4249 RWF mukanya gashize.',
  },
  {
    id: 'patrick-upgrade',
    type: 'upgrade',
    message: '078236XXXXXX abikuje 16209 RWF aka kanya.',
  },
  {
    id: 'ange-bonus',
    type: 'bonus',
    message: '072683XXXXXX abonye 4000 RWF bonus.',
  },
  {
    id: 'sibomana-withdrawal',
    type: 'withdrawal',
    message: '079532XXXXXX abikuje 15,000 RWF aka kanya.',
  },
    {
    id: 'Uwera-upgrade',
    type: 'upgrade',
    message: '072961XXXXXX azamuye konti ye kuri Pro.',
  },
  {
    id: 'Kabatesi-withdrawal',
    type: 'withdrawal',
    message: '078030XXXXXX abikuje 20,000 RWF aka kanya.',
  },
  {
    id: 'Albine-withdrawal',
    type: 'withdrawal',
    message: '073123XXXXXX abikuje 8,000 RWF mu kanya gashize.',
  },
  {
    id: 'Jean-bonus',
    type: 'bonus',
    message: '073984XXXXXX abonye 6000 RWF bonus.',
  },
  {
    id: 'Diane-upgrade',
    type: 'upgrade',
    message: '078845XXXXXX azamuye konti ye kuri Pro Max.',
  },
  {
    id: 'Muhirwa-withdrawal',
    type: 'withdrawal',
    message: '073837XXXXXX abikuje 52,453 RWF mu kanya gashize.',
  }
]
